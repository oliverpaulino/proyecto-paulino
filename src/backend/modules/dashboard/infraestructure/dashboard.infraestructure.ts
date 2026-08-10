import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import type {
   AlertaEquipo,
   CicloNominaAbierto,
   CitaProxima,
   ConduceSinFirmar,
   DeduccionPendiente,
   FacturacionSemanal,
   FlotaResumen,
   FlujoMes,
   LicenciaPorVencer,
   MotivoAlertaEquipo,
   OrdenCompraPendiente,
   ProyectoActivo,
   SeveridadAlerta,
   UmbralesAlertaEquipo,
} from "../domain/dashboard.domain";

const num = (v: unknown): number => Number(v ?? 0);

/** `PRO-001`, `GAS-012`… mismo formato que usan los demás módulos. */
const codigo = (prefijo: string, referencia: unknown): string =>
   `${prefijo}-${String(num(referencia)).padStart(3, "0")}`;

/**
 * Agregaciones del panel principal.
 *
 * Todo suma en Postgres y devuelve totales: ningún método de acá se trae un
 * listado completo para reducirlo en JS. Los widgets son de solo lectura.
 */
export class KyselyDashboardRepository {
   constructor(private readonly db: Kysely<DB>) { }

   // ── Facturación (conduces cobrables) ───────────────────────────────────
   /**
    * Serie de 14 días partida en dos semanas de 7. Se consulta de una sola vez
    * y se parte en JS: dos queries para lo mismo cuestan dos round-trips.
    *
    * `subtotal` es lo FACTURADO AL CLIENTE, no el pago al chofer.
    */
   async facturacionSemanal(): Promise<FacturacionSemanal> {
      const filas = await this.db
         .selectFrom("conduce")
         .select([
            sql<string>`to_char(conduce.fecha, 'YYYY-MM-DD')`.as("fecha"),
            sql<number>`COALESCE(SUM(conduce.subtotal), 0)`.as("monto"),
            sql<number>`COUNT(*)`.as("cantidad"),
         ])
         .where("conduce.deleted_at", "is", null)
         .where("conduce.es_cobrable", "=", true)
         .where(sql<boolean>`conduce.fecha >= CURRENT_DATE - INTERVAL '13 days'`)
         .where(sql<boolean>`conduce.fecha <= CURRENT_DATE`)
         .groupBy(sql`to_char(conduce.fecha, 'YYYY-MM-DD')`)
         .execute();

      const porFecha = new Map(filas.map((f) => [f.fecha, f]));

      // Se rellenan los 14 días para que la serie no tenga huecos: un día sin
      // conduces es un 0 en el sparkline, no un punto que falta.
      const dias: Array<{ fecha: string; monto: number; cantidad: number }> = [];
      const hoy = new Date();
      for (let i = 13; i >= 0; i--) {
         const d = new Date(hoy);
         d.setDate(d.getDate() - i);
         const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
         const hit = porFecha.get(key);
         dias.push({
            fecha: key,
            monto: num(hit?.monto),
            cantidad: num(hit?.cantidad),
         });
      }

      const anterior = dias.slice(0, 7);
      const actual = dias.slice(7);

      const total_semana = actual.reduce((s, d) => s + d.monto, 0);
      const total_semana_anterior = anterior.reduce((s, d) => s + d.monto, 0);

      return {
         total_semana,
         total_semana_anterior,
         // Sin base no hay porcentaje: dividir entre 0 daría Infinity y la UI
         // pintaría "∞%". NULL se rotula "sin comparación".
         variacion_pct:
            total_semana_anterior === 0
               ? null
               : ((total_semana - total_semana_anterior) / total_semana_anterior) * 100,
         cantidad_conduces: actual.reduce((s, d) => s + d.cantidad, 0),
         serie: actual.map((d) => ({
            fecha: d.fecha,
            monto: d.monto,
            cantidad_conduces: d.cantidad,
         })),
      };
   }

   // ── Flujo: cobros (pago ENTRADA) vs. gastos ────────────────────────────
   /**
    * Serie mensual. Cobros y gastos salen de tablas distintas, así que se
    * consultan por separado y se cruzan por mes en JS (son ≤ `meses` filas
    * cada una).
    */
   async flujoMensual(meses: number): Promise<FlujoMes[]> {
      const desde = sql<boolean>`fecha >= date_trunc('month', CURRENT_DATE) - INTERVAL '${sql.raw(String(meses - 1))} months'`;

      const cobros = await this.db
         .selectFrom("pago")
         .select([
            sql<string>`to_char(pago.fecha, 'YYYY-MM')`.as("mes"),
            sql<number>`COALESCE(SUM(pago.monto_pagado), 0)`.as("total"),
         ])
         .where("pago.deleted_at", "is", null)
         .where("pago.tipo_movimiento", "=", "ENTRADA")
         .where(desde)
         .groupBy(sql`to_char(pago.fecha, 'YYYY-MM')`)
         .execute();

      const gastos = await this.db
         .selectFrom("gasto")
         .select([
            sql<string>`to_char(gasto.fecha, 'YYYY-MM')`.as("mes"),
            sql<number>`COALESCE(SUM(gasto.monto_total), 0)`.as("total"),
         ])
         .where("gasto.deleted_at", "is", null)
         .where(desde)
         .groupBy(sql`to_char(gasto.fecha, 'YYYY-MM')`)
         .execute();

      const mapCobros = new Map(cobros.map((r) => [r.mes, num(r.total)]));
      const mapGastos = new Map(gastos.map((r) => [r.mes, num(r.total)]));

      const serie: FlujoMes[] = [];
      const hoy = new Date();
      for (let i = meses - 1; i >= 0; i--) {
         const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
         const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
         serie.push({
            mes,
            cobrado: mapCobros.get(mes) ?? 0,
            gastado: mapGastos.get(mes) ?? 0,
         });
      }
      return serie;
   }

   // ── Nómina ─────────────────────────────────────────────────────────────
   /**
    * Ciclos que todavía cuestan plata: todo lo que no esté PAGADO. El neto
    * sale del snapshot `payroll_cycle_employees`, que está en 0 mientras el
    * ciclo no se haya calculado — eso es correcto, no un dato faltante.
    */
   async ciclosNominaAbiertos(): Promise<CicloNominaAbierto[]> {
      const filas = await this.db
         .selectFrom("payroll_cycles as pc")
         .leftJoin("payroll_cycle_employees as pce", "pce.cycle_id", "pc.id")
         .select([
            "pc.id",
            "pc.nombre",
            "pc.frecuencia",
            "pc.estado",
            "pc.fecha_inicio",
            "pc.fecha_fin",
            "pc.fecha_pago",
            sql<number>`COALESCE(SUM(pce.neto_pagar), 0)`.as("neto_total"),
            sql<number>`COUNT(pce.id)`.as("cantidad_empleados"),
            sql<number>`COALESCE(SUM(pce.conduces_inferidos), 0)`.as("conduces_inferidos"),
         ])
         .where("pc.estado", "!=", "PAGADO")
         .groupBy([
            "pc.id", "pc.nombre", "pc.frecuencia", "pc.estado",
            "pc.fecha_inicio", "pc.fecha_fin", "pc.fecha_pago",
         ])
         .orderBy("pc.fecha_inicio", "desc")
         .execute();

      return filas.map((f) => ({
         id: f.id,
         nombre: f.nombre,
         frecuencia: f.frecuencia,
         estado: f.estado,
         fecha_inicio: new Date(f.fecha_inicio),
         fecha_fin: new Date(f.fecha_fin),
         fecha_pago: f.fecha_pago ? new Date(f.fecha_pago) : null,
         neto_total: num(f.neto_total),
         cantidad_empleados: num(f.cantidad_empleados),
         conduces_inferidos: num(f.conduces_inferidos),
      }));
   }

   async deduccionesPendientes(limite: number): Promise<DeduccionPendiente[]> {
      const filas = await this.db
         .selectFrom("deduccion as d")
         .leftJoin("empleado as e", "e.id", "d.empleado_id")
         .select([
            "d.id", "d.referencia", "d.concepto", "d.monto_total",
            "d.monto_cuota", "d.balance_pendiente",
            "e.nombre as empleado_nombre",
         ])
         .where("d.deleted_at", "is", null)
         // balance NULL = deducción recién creada que aún no ha cobrado cuota,
         // así que debe contar como pendiente por su monto total.
         .where((eb) =>
            eb.or([
               eb("d.balance_pendiente", "is", null),
               eb("d.balance_pendiente", ">", 0),
            ]),
         )
         .orderBy("d.fecha", "desc")
         .limit(limite)
         .execute();

      return filas.map((f) => ({
         id: f.id,
         referencia: num(f.referencia),
         empleado_nombre: f.empleado_nombre ?? null,
         concepto: f.concepto,
         monto_total: num(f.monto_total),
         balance_pendiente: f.balance_pendiente === null ? num(f.monto_total) : num(f.balance_pendiente),
         monto_cuota: num(f.monto_cuota),
      }));
   }

   // ── Proyectos ──────────────────────────────────────────────────────────
   /**
    * Activos ordenados por rentabilidad ASCENDENTE: los que pierden plata van
    * arriba, que es lo que hay que mirar primero.
    *
    * Los montos salen de las columnas cacheadas de `proyecto`; no se recalculan
    * acá para no divergir de lo que muestra el módulo de proyectos.
    */
   async proyectosActivos(limite: number): Promise<ProyectoActivo[]> {
      const filas = await this.db
         .selectFrom("proyecto as p")
         .leftJoin("cliente as c", "c.id", "p.cliente_id")
         .select([
            "p.id", "p.referencia", "p.nombre", "p.fecha_inicio",
            "p.total_cobrable", "p.total_gasto_interno", "p.rentabilidad",
            "c.nombre as cliente_nombre",
         ])
         .where("p.estado", "=", "EN PROGRESO")
         .orderBy("p.rentabilidad", "asc")
         .limit(limite)
         .execute();

      return filas.map((f) => {
         const cobrable = num(f.total_cobrable);
         return {
            id: f.id,
            referencia: num(f.referencia),
            codigoReferencia: codigo("PRO", f.referencia),
            nombre: f.nombre,
            cliente_nombre: f.cliente_nombre ?? null,
            fecha_inicio: new Date(f.fecha_inicio),
            total_cobrable: cobrable,
            total_gasto_interno: num(f.total_gasto_interno),
            rentabilidad: num(f.rentabilidad),
            margen_pct: cobrable === 0 ? null : (num(f.rentabilidad) / cobrable) * 100,
         };
      });
   }

   // ── Equipos ────────────────────────────────────────────────────────────
   async flotaResumen(): Promise<FlotaResumen> {
      const filas = await this.db
         .selectFrom("equipo")
         .select(["equipo.estado", sql<number>`COUNT(*)`.as("cantidad")])
         .groupBy("equipo.estado")
         .execute();

      const porEstado = new Map(filas.map((f) => [f.estado, num(f.cantidad)]));
      const activos = porEstado.get("ACTIVO") ?? 0;
      const en_mantenimiento = porEstado.get("EN_MANTENIMIENTO") ?? 0;
      const inactivos = porEstado.get("INACTIVO") ?? 0;

      return {
         activos,
         en_mantenimiento,
         inactivos,
         // Suma de TODOS los estados, no solo los tres conocidos: si mañana
         // aparece un estado nuevo el total sigue cuadrando.
         total: filas.reduce((s, f) => s + num(f.cantidad), 0),
      };
   }

   /**
    * Alertas de equipo derivadas SOLO de fechas e historial.
    *
    * No hay horómetro ni kilometraje en `equipo`, así que no se puede calcular
    * "próximo a mantenimiento" por uso. Lo que sí se deriva:
    *   1. días desde el último PREVENTIVO cerrado (o nunca haber tenido uno),
    *   2. mantenimientos abiertos que se alargan (plata quieta),
    *   3. reincidencia de CORRECTIVOS en ventana corta.
    *
    * Un equipo puede disparar varios motivos; se queda con el más severo para
    * no repetir la misma máquina cuatro veces en la lista.
    */
   async alertasEquipos(u: UmbralesAlertaEquipo, limite: number): Promise<AlertaEquipo[]> {
      const filas = await this.db
         .selectFrom("equipo as e")
         .select([
            "e.id", "e.referencia", "e.nombre", "e.placa", "e.estado",
            // Último preventivo CERRADO. Uno abierto todavía no protege nada.
            sql<Date | null>`(
               SELECT MAX(m.fecha_fin) FROM mantenimiento m
               WHERE m.equipo_id = e.id AND m.tipo = 'PREVENTIVO'
                 AND m.fecha_fin IS NOT NULL
            )`.as("ultimo_preventivo"),
            sql<Date | null>`(
               SELECT MIN(m.fecha_inicio) FROM mantenimiento m
               WHERE m.equipo_id = e.id AND m.fecha_fin IS NULL
            )`.as("mantenimiento_abierto_desde"),
            sql<number>`(
               SELECT COUNT(*) FROM mantenimiento m
               WHERE m.equipo_id = e.id AND m.tipo = 'CORRECTIVO'
                 AND m.fecha_inicio >= CURRENT_DATE - (${u.correctivos_ventana_dias} || ' days')::interval
            )`.as("correctivos_recientes"),
         ])
         // Un equipo dado de baja no necesita mantenimiento: alertarlo sería
         // ruido permanente que entrena a ignorar el widget.
         .where("e.estado", "!=", "INACTIVO")
         .execute();

      const hoy = Date.now();
      const dias = (d: Date | null): number | null =>
         d === null ? null : Math.floor((hoy - new Date(d).getTime()) / 86_400_000);

      const alertas: AlertaEquipo[] = [];

      for (const f of filas) {
         const diasPreventivo = dias(f.ultimo_preventivo);
         const diasAbierto = dias(f.mantenimiento_abierto_desde);
         const correctivos = num(f.correctivos_recientes);

         // Candidatos: cada regla propone su severidad y su texto.
         const candidatos: Array<{
            motivo: MotivoAlertaEquipo;
            severidad: SeveridadAlerta;
            detalle: string;
         }> = [];

         if (diasAbierto !== null && diasAbierto >= u.mantenimiento_abierto_ambar_dias) {
            candidatos.push({
               motivo: "MANTENIMIENTO_LARGO",
               severidad: diasAbierto >= u.mantenimiento_abierto_rojo_dias ? "ROJO" : "AMBAR",
               detalle: `${diasAbierto} días en mantenimiento`,
            });
         }

         if (diasPreventivo === null) {
            // Nunca tuvo preventivo. Ámbar y no rojo: puede ser un equipo
            // recién comprado, no necesariamente uno abandonado.
            candidatos.push({
               motivo: "SIN_PREVENTIVO",
               severidad: "AMBAR",
               detalle: "Sin preventivo registrado",
            });
         } else if (diasPreventivo >= u.preventivo_ambar_dias) {
            candidatos.push({
               motivo: "PREVENTIVO_VENCIDO",
               severidad: diasPreventivo >= u.preventivo_rojo_dias ? "ROJO" : "AMBAR",
               detalle: `${diasPreventivo} días sin preventivo`,
            });
         }

         if (correctivos >= u.correctivos_umbral) {
            candidatos.push({
               motivo: "CORRECTIVOS_REPETIDOS",
               severidad: "ROJO",
               detalle: `${correctivos} correctivos en ${u.correctivos_ventana_dias} días`,
            });
         }

         if (candidatos.length === 0) continue;

         const peor =
            candidatos.find((c) => c.severidad === "ROJO") ?? candidatos[0];

         alertas.push({
            equipo_id: f.id,
            referencia: num(f.referencia),
            codigoReferencia: codigo("EQ", f.referencia),
            nombre: f.nombre,
            placa: f.placa ?? null,
            estado: f.estado,
            motivo: peor.motivo,
            severidad: peor.severidad,
            detalle: peor.detalle,
            dias_desde_preventivo: diasPreventivo,
            dias_mantenimiento_abierto: diasAbierto,
            correctivos_recientes: correctivos,
         });
      }

      // Rojos primero; dentro de cada grupo, lo más viejo sin preventivo.
      alertas.sort((a, b) => {
         if (a.severidad !== b.severidad) return a.severidad === "ROJO" ? -1 : 1;
         return (b.dias_desde_preventivo ?? 0) - (a.dias_desde_preventivo ?? 0);
      });

      return alertas.slice(0, limite);
   }

   // ── Operativo ──────────────────────────────────────────────────────────
   /**
    * Cobrables sin firma. Es donde se traba CxC: sin firma del cliente el
    * conduce no se puede cobrar.
    */
   async conducesSinFirmar(limite: number): Promise<ConduceSinFirmar[]> {
      const filas = await this.db
         .selectFrom("conduce as co")
         .leftJoin("cliente as cl", "cl.id", "co.cliente_id")
         .leftJoin("equipo as e", "e.id", "co.equipo_id")
         .select([
            "co.id", "co.numero_referencia", "co.fecha", "co.subtotal",
            "co.firma_recibido", "co.firma_chofer",
            "cl.nombre as cliente_nombre",
            "e.nombre as equipo_nombre",
            sql<number>`GREATEST(0, (CURRENT_DATE - co.fecha::date))`.as("dias_pendiente"),
         ])
         .where("co.deleted_at", "is", null)
         .where("co.es_cobrable", "=", true)
         .where((eb) =>
            eb.or([
               eb("co.firma_recibido", "=", false),
               eb("co.firma_chofer", "=", false),
            ]),
         )
         .orderBy("co.fecha", "asc")
         .limit(limite)
         .execute();

      return filas.map((f) => ({
         id: f.id,
         numero_referencia: f.numero_referencia,
         fecha: new Date(f.fecha),
         cliente_nombre: f.cliente_nombre ?? null,
         equipo_nombre: f.equipo_nombre ?? null,
         subtotal: num(f.subtotal),
         falta_firma_recibido: !f.firma_recibido,
         falta_firma_chofer: !f.firma_chofer,
         dias_pendiente: num(f.dias_pendiente),
      }));
   }

   /** Incluye las YA vencidas (días negativos): son las más urgentes. */
   async licenciasPorVencer(diasAviso: number, limite: number): Promise<LicenciaPorVencer[]> {
      const filas = await this.db
         .selectFrom("operador as o")
         .innerJoin("empleado as e", "e.id", "o.empleado_id")
         .select([
            "o.id as operador_id", "o.empleado_id", "o.licencia",
            "o.fecha_vencimiento", "e.nombre as empleado_nombre",
            sql<number>`(o.fecha_vencimiento::date - CURRENT_DATE)`.as("dias_para_vencer"),
         ])
         .where("o.fecha_vencimiento", "is not", null)
         .where("e.activo", "=", true)
         .where(
            sql<boolean>`o.fecha_vencimiento::date <= CURRENT_DATE + (${diasAviso} || ' days')::interval`,
         )
         .orderBy("o.fecha_vencimiento", "asc")
         .limit(limite)
         .execute();

      return filas.map((f) => ({
         operador_id: f.operador_id,
         empleado_id: f.empleado_id,
         empleado_nombre: f.empleado_nombre,
         licencia: f.licencia,
         fecha_vencimiento: new Date(f.fecha_vencimiento!),
         dias_para_vencer: num(f.dias_para_vencer),
      }));
   }

   /** BORRADOR y PENDIENTE son las que todavía esperan aprobación. */
   async ordenesCompraPendientes(limite: number): Promise<OrdenCompraPendiente[]> {
      const filas = await this.db
         .selectFrom("orden_compra as oc")
         .leftJoin("proveedor as p", "p.id", "oc.proveedor_id")
         .select([
            "oc.id", "oc.referencia", "oc.fecha", "oc.total", "oc.estado",
            "p.nombre as proveedor_nombre",
            sql<number>`GREATEST(0, (CURRENT_DATE - oc.fecha::date))`.as("dias_pendiente"),
         ])
         .where("oc.deleted_at", "is", null)
         .where("oc.approved_at", "is", null)
         .where("oc.estado", "in", ["BORRADOR", "PENDIENTE"])
         .orderBy("oc.fecha", "asc")
         .limit(limite)
         .execute();

      return filas.map((f) => ({
         id: f.id,
         referencia: num(f.referencia),
         codigoReferencia: codigo("OC", f.referencia),
         proveedor_nombre: f.proveedor_nombre ?? null,
         fecha: new Date(f.fecha),
         total: num(f.total),
         estado: f.estado,
         dias_pendiente: num(f.dias_pendiente),
      }));
   }

   async citasProximas(dias: number, limite: number): Promise<CitaProxima[]> {
      const filas = await this.db
         .selectFrom("cita as ci")
         .leftJoin("cliente as cl", "cl.id", "ci.cliente_id")
         .select([
            "ci.id", "ci.referencia", "ci.fecha", "ci.motivo", "ci.estado",
            "cl.nombre as cliente_nombre",
         ])
         .where(sql<boolean>`ci.fecha::date >= CURRENT_DATE`)
         .where(sql<boolean>`ci.fecha::date <= CURRENT_DATE + (${dias} || ' days')::interval`)
         .where("ci.estado", "!=", "CANCELADA")
         .orderBy("ci.fecha", "asc")
         .limit(limite)
         .execute();

      return filas.map((f) => ({
         id: f.id,
         referencia: num(f.referencia),
         fecha: new Date(f.fecha),
         cliente_nombre: f.cliente_nombre ?? null,
         motivo: f.motivo ?? null,
         estado: f.estado,
      }));
   }
}
