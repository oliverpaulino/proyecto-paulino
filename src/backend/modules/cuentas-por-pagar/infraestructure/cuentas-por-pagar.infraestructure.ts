import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   ICuentasPorPagarRepository,
   CuentasPorPagarFiltros,
   CuentasPorPagarResult,
   CuentaPorPagar,
   ResumenCuentasPorPagar,
   TipoCuenta,
} from "../domain/cuentas-por-pagar.domain";
import { estadoDeCuenta } from "../domain/cuentas-por-pagar.domain";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

function aFechaISO(v: Date | string): string {
   if (typeof v === "string") return v.slice(0, 10);
   const y = v.getFullYear();
   const m = String(v.getMonth() + 1).padStart(2, "0");
   const d = String(v.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

/** Días completos entre la fecha del documento y hoy. */
function diasDesde(fecha: Date | string): number {
   const f = typeof fecha === "string" ? new Date(`${fecha.slice(0, 10)}T12:00:00`) : new Date(fecha);
   const hoy = new Date();
   const ms = hoy.getTime() - f.getTime();
   return Math.floor(ms / 86_400_000);
}

export class KyselyCuentasPorPagarRepository implements ICuentasPorPagarRepository {
   constructor(private readonly db: Kysely<DB>) {}

   /**
    * Trae gastos y costos vivos con lo que se les ha pagado.
    *
    * El pagado se calcula con un subselect correlacionado en vez de un JOIN +
    * GROUP BY: con el join, un documento con tres pagos se duplicaría y habría
    * que agrupar todas las columnas. Los pagos anulados (`deleted_at`) no
    * cuentan — si se anula un pago, la deuda vuelve a estar viva.
    */
   async listar(filtros: CuentasPorPagarFiltros): Promise<CuentasPorPagarResult> {
      const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
      const pageSize = filtros.pageSize && filtros.pageSize > 0 ? filtros.pageSize : 25;

      const pagadoDe = (columna: "gasto_empresa_id" | "costo_cliente_id", idRef: string) => sql<string>`(
         select coalesce(sum(p.monto_pagado), 0)
         from pago p
         where p.${sql.raw(columna)} = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      const ultimoPagoDe = (columna: "gasto_empresa_id" | "costo_cliente_id", idRef: string) => sql<Date | null>`(
         select max(p.fecha)
         from pago p
         where p.${sql.raw(columna)} = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      const cantPagosDe = (columna: "gasto_empresa_id" | "costo_cliente_id", idRef: string) => sql<string>`(
         select count(*)
         from pago p
         where p.${sql.raw(columna)} = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      const filas: CuentaPorPagar[] = [];

      // ── Gastos ────────────────────────────────────────────────────────────
      if (filtros.tipo !== "COSTO") {
         let q = this.db
            .selectFrom("gasto")
            .leftJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
            .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
            .select([
               "gasto.id",
               "gasto.referencia",
               "gasto.concepto",
               "gasto.ncf",
               "gasto.fecha",
               "gasto.monto_total",
               "gasto.orden_compra_id",
               "orden_compra.referencia as oc_referencia",
               "categoria_gasto.nombre as categoria_gasto_nombre",
               pagadoDe("gasto_empresa_id", "gasto.id").as("pagado"),
               ultimoPagoDe("gasto_empresa_id", "gasto.id").as("ultimo_pago_fecha"),
               cantPagosDe("gasto_empresa_id", "gasto.id").as("cantidad_pagos"),
            ])
            .where("gasto.deleted_at", "is", null);

         if (filtros.categoria_gasto_id)
            q = q.where("gasto.categoria_gasto_id", "=", filtros.categoria_gasto_id);
         if (filtros.fecha_desde)
            q = q.where("gasto.fecha", ">=", aFechaISO(filtros.fecha_desde) as any);
         if (filtros.fecha_hasta)
            q = q.where("gasto.fecha", "<=", aFechaISO(filtros.fecha_hasta) as any);
         if (filtros.busqueda) {
            const b = `%${filtros.busqueda}%`;
            q = q.where((eb) =>
               eb.or([
                  eb("gasto.concepto", "ilike", b),
                  eb("gasto.ncf", "ilike", b),
                  eb(sql`gasto.referencia::text`, "ilike", b),
               ])
            );
         }

         for (const r of await q.execute()) {
            const monto = num(r.monto_total);
            const pagado = num(r.pagado);
            filas.push({
               id: r.id,
               tipo: "GASTO" as TipoCuenta,
               referencia: num(r.referencia),
               codigoReferencia: `GAS-${String(r.referencia).padStart(3, "0")}`,
               concepto: r.concepto,
               ncf: r.ncf ?? null,
               fecha: r.fecha,
               monto_total: monto,
               pagado,
               pendiente: Math.max(0, monto - pagado),
               estado: estadoDeCuenta(monto, pagado),
               dias_transcurridos: diasDesde(r.fecha),
               categoria_gasto_nombre: r.categoria_gasto_nombre ?? null,
               proyecto_id: null,
               proyecto_nombre: null,
               orden_compra_id: r.orden_compra_id ?? null,
               orden_compra_codigo_referencia: r.oc_referencia
                  ? `OC-${String(r.oc_referencia).padStart(3, "0")}`
                  : null,
               ultimo_pago_fecha: (r.ultimo_pago_fecha as Date | null) ?? null,
               cantidad_pagos: num(r.cantidad_pagos),
            });
         }
      }

      // ── Costos ────────────────────────────────────────────────────────────
      if (filtros.tipo !== "GASTO") {
         let q = this.db
            .selectFrom("costo")
            .leftJoin("proyecto", "proyecto.id", "costo.proyecto_id")
            .leftJoin("orden_compra", "orden_compra.id", "costo.orden_compra_id")
            .select([
               "costo.id",
               "costo.referencia",
               "costo.concepto",
               "costo.ncf",
               "costo.fecha",
               "costo.monto_total",
               "costo.proyecto_id",
               "costo.orden_compra_id",
               // `proyecto` no tiene columna `referencia`: se identifica por nombre.
               "proyecto.nombre as proyecto_nombre",
               "orden_compra.referencia as oc_referencia",
               pagadoDe("costo_cliente_id", "costo.id").as("pagado"),
               ultimoPagoDe("costo_cliente_id", "costo.id").as("ultimo_pago_fecha"),
               cantPagosDe("costo_cliente_id", "costo.id").as("cantidad_pagos"),
            ])
            .where("costo.deleted_at", "is", null);

         if (filtros.proyecto_id) q = q.where("costo.proyecto_id", "=", filtros.proyecto_id);
         if (filtros.fecha_desde)
            q = q.where("costo.fecha", ">=", aFechaISO(filtros.fecha_desde) as any);
         if (filtros.fecha_hasta)
            q = q.where("costo.fecha", "<=", aFechaISO(filtros.fecha_hasta) as any);
         if (filtros.busqueda) {
            const b = `%${filtros.busqueda}%`;
            q = q.where((eb) =>
               eb.or([
                  eb("costo.concepto", "ilike", b),
                  eb("costo.ncf", "ilike", b),
                  eb(sql`costo.referencia::text`, "ilike", b),
               ])
            );
         }

         for (const r of await q.execute()) {
            const monto = num(r.monto_total);
            const pagado = num(r.pagado);
            filas.push({
               id: r.id,
               tipo: "COSTO" as TipoCuenta,
               referencia: num(r.referencia),
               codigoReferencia: `COS-${String(r.referencia).padStart(3, "0")}`,
               concepto: r.concepto,
               ncf: r.ncf ?? null,
               fecha: r.fecha,
               monto_total: monto,
               pagado,
               pendiente: Math.max(0, monto - pagado),
               estado: estadoDeCuenta(monto, pagado),
               dias_transcurridos: diasDesde(r.fecha),
               categoria_gasto_nombre: null,
               proyecto_id: r.proyecto_id ?? null,
               proyecto_nombre: r.proyecto_nombre ?? null,
               orden_compra_id: r.orden_compra_id ?? null,
               orden_compra_codigo_referencia: r.oc_referencia
                  ? `OC-${String(r.oc_referencia).padStart(3, "0")}`
                  : null,
               ultimo_pago_fecha: (r.ultimo_pago_fecha as Date | null) ?? null,
               cantidad_pagos: num(r.cantidad_pagos),
            });
         }
      }

      // El estado se deriva en memoria (depende de la suma de pagos), así que
      // el filtrado por estado y el orden también se hacen aquí.
      let resultado = filas;
      if (filtros.estado) {
         resultado = resultado.filter((f) => f.estado === filtros.estado);
      } else if (!filtros.incluir_pagadas) {
         // "Cuentas POR pagar": lo saldado no es deuda.
         resultado = resultado.filter((f) => f.estado !== "PAGADO");
      }

      // Lo más viejo primero: es lo que lleva más tiempo sin pagarse.
      resultado.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

      const resumen = this.#resumir(resultado);
      const total = resultado.length;
      const inicio = (page - 1) * pageSize;

      return {
         data: resultado.slice(inicio, inicio + pageSize),
         resumen,
         total,
         page,
         pageSize,
      };
   }

   /** El resumen describe TODO lo filtrado, no solo la página visible. */
   #resumir(filas: CuentaPorPagar[]): ResumenCuentasPorPagar {
      const r: ResumenCuentasPorPagar = {
         total_documentos: filas.length,
         total_monto: 0,
         total_pagado: 0,
         total_pendiente: 0,
         pendientes: 0,
         parciales: 0,
         gastos_pendiente: 0,
         costos_pendiente: 0,
         antiguedad: { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 },
      };

      for (const f of filas) {
         r.total_monto += f.monto_total;
         r.total_pagado += f.pagado;
         r.total_pendiente += f.pendiente;

         if (f.estado === "PENDIENTE") r.pendientes++;
         if (f.estado === "PARCIAL") r.parciales++;

         if (f.tipo === "GASTO") r.gastos_pendiente += f.pendiente;
         else r.costos_pendiente += f.pendiente;

         const d = f.dias_transcurridos;
         if (d <= 30) r.antiguedad.hasta_30 += f.pendiente;
         else if (d <= 60) r.antiguedad.de_31_a_60 += f.pendiente;
         else if (d <= 90) r.antiguedad.de_61_a_90 += f.pendiente;
         else r.antiguedad.mas_de_90 += f.pendiente;
      }

      return r;
   }
}
