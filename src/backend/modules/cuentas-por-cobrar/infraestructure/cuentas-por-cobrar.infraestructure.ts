import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   ICuentasPorCobrarRepository,
   CuentasPorCobrarFiltros,
   CuentasPorCobrarResult,
   DetalleClienteCuentasPorCobrar,
   CuentaPorCobrar,
   ConduceDetalleCxc,
   ClienteCuentaPorCobrar,
   ResumenCuentasPorCobrar,
   PagoCxc,
   AntiguedadMontos,
   TipoCuentaCxc,
} from "../domain/cuentas-por-cobrar.domain";
import {
   estadoDeCuenta,
   diasDesde,
} from "../domain/cuentas-por-cobrar.domain";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

function aFechaISO(v: Date | string): string {
   if (typeof v === "string") return v.slice(0, 10);
   const y = v.getFullYear();
   const m = String(v.getMonth() + 1).padStart(2, "0");
   const d = String(v.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

/**
 * Suma un día a un string "YYYY-MM-DD" (mismo criterio que el módulo de
 * conduces: no pasar por `new Date()` para no correr la fecha por timezone).
 */
function siguienteDiaISO(fechaISO: string): string {
   const [y, m, d] = fechaISO.split("-").map(Number);
   const utc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
   utc.setUTCDate(utc.getUTCDate() + 1);
   return utc.toISOString().slice(0, 10);
}

/** `PRO-XXX` — mismo formato que proyecto.infraestructure. */
function codigoProyecto(referencia: number): string {
   return `PRO-${String(referencia).padStart(3, "0")}`;
}

function bucketAntiguedad(dias: number, monto: number, acc: AntiguedadMontos) {
   if (dias <= 30) acc.hasta_30 += monto;
   else if (dias <= 60) acc.de_31_a_60 += monto;
   else if (dias <= 90) acc.de_61_a_90 += monto;
   else acc.mas_de_90 += monto;
}

export class KyselyCuentasPorCobrarRepository implements ICuentasPorCobrarRepository {
   constructor(private readonly db: Kysely<DB>) {}

   /**
    * Folios cobrables (proyectos y conduces sueltos) con lo que se les ha
    * cobrado.
    *
    * El cobrado se calcula con subselects correlacionados en vez de un JOIN +
    * GROUP BY: con el join, un folio con varios pagos se duplicaría y habría
    * que agrupar todas las columnas. Los pagos anulados (`deleted_at`) no
    * cuentan — si se anula un pago, la deuda vuelve a estar viva.
    */
   async listar(filtros: CuentasPorCobrarFiltros): Promise<CuentasPorCobrarResult> {
      const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
      const pageSize = filtros.pageSize && filtros.pageSize > 0 ? filtros.pageSize : 25;

      const folios = await this.#listarFoliosCobrables(filtros);

      // ── Agregar por cliente ──────────────────────────────────────────────
      const porCliente = new Map<string, ClienteCuentaPorCobrar>();
      for (const f of folios) {
         let fila = porCliente.get(f.cliente_id);
         if (!fila) {
            fila = {
               cliente_id: f.cliente_id,
               cliente_nombre: f.cliente_nombre ?? "Sin nombre",
               cliente_telefono: f.cliente_telefono ?? null,
               cliente_email: f.cliente_email ?? null,
               total_facturado: 0,
               total_pagado: 0,
               saldo_pendiente: 0,
               cantidad_documentos: 0,
               documentos_pendientes: 0,
               ultimo_pago_fecha: null,
               dias_transcurridos: Number.MAX_SAFE_INTEGER,
               estado: "PENDIENTE",
               antiguedad: { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 },
            };
            porCliente.set(f.cliente_id, fila);
         }
         fila.total_facturado += f.monto_total;
         fila.total_pagado += f.pagado;
         fila.saldo_pendiente += f.pendiente;
         fila.cantidad_documentos += 1;
         if (f.pendiente > 0.01) fila.documentos_pendientes += 1;
         if (f.ultimo_pago_fecha && (!fila.ultimo_pago_fecha || f.ultimo_pago_fecha > fila.ultimo_pago_fecha)) {
            fila.ultimo_pago_fecha = f.ultimo_pago_fecha;
         }
         fila.dias_transcurridos = Math.min(fila.dias_transcurridos, f.dias_transcurridos);
         bucketAntiguedad(f.dias_transcurridos, f.pendiente, fila.antiguedad);
      }

      let filas = [...porCliente.values()].map((f) => {
         f.dias_transcurridos = f.dias_transcurridos === Number.MAX_SAFE_INTEGER ? 0 : f.dias_transcurridos;
         f.estado = estadoDeCuenta(f.total_facturado, f.total_pagado);
         return f;
      });

      // El estado se deriva en memoria (depende de la suma de pagos), así que
      // el filtrado por estado y el orden también se hacen aquí.
      if (filtros.estado) {
         filas = filas.filter((f) => f.estado === filtros.estado);
      } else if (!filtros.incluir_pagadas) {
         // "Cuentas POR cobrar": lo saldado no es deuda.
         filas = filas.filter((f) => f.estado !== "PAGADO");
      }

      // El que lleva más tiempo sin pagar arriba.
      filas.sort((a, b) => {
         if (b.saldo_pendiente > 0 && a.saldo_pendiente > 0) {
            return a.dias_transcurridos - b.dias_transcurridos;
         }
         return b.saldo_pendiente - a.saldo_pendiente;
      });

      const resumen = this.#resumir(filas);
      const total = filas.length;
      const inicio = (page - 1) * pageSize;

      return {
         data: filas.slice(inicio, inicio + pageSize),
         resumen,
         total,
         page,
         pageSize,
      };
   }

   async detalleCliente(clienteId: string, filtros: CuentasPorCobrarFiltros): Promise<DetalleClienteCuentasPorCobrar> {
      const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
      const pageSize = filtros.pageSize && filtros.pageSize > 0 ? filtros.pageSize : 50;

      const cliente = await this.db
         .selectFrom("cliente")
         .select(["id", "nombre", "telefono", "email", "identificacion"])
         .where("id", "=", clienteId)
         .executeTakeFirst();
      if (!cliente) throw new Error("Cliente no encontrado");

      const folios = await this.#listarFoliosCobrables({
         ...filtros,
         cliente_id: clienteId,
         incluir_pagadas: true,
      });

      const antiguedad: AntiguedadMontos = { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 };
      let facturado = 0;
      let pagado = 0;
      let documentos_pendientes = 0;
      for (const f of folios) {
         facturado += f.monto_total;
         pagado += f.pagado;
         if (f.pendiente > 0.01) documentos_pendientes += 1;
         bucketAntiguedad(f.dias_transcurridos, f.pendiente, antiguedad);
      }

      // Historial de pagos del cliente: los que apuntan a sus conduces o a sus
      // proyectos (sin anular).
      const historial = await this.db
         .selectFrom("pago")
         .leftJoin("conduce", "conduce.id", "pago.conduce_id")
         .leftJoin("proyecto", "proyecto.id", "pago.proyecto_id")
         .select([
            "pago.id",
            "pago.referencia",
            "pago.monto_pagado",
            "pago.metodo_pago",
            "pago.fecha",
            "pago.concepto",
            "pago.created_at",
            "pago.deleted_at",
            "pago.conduce_id",
            "pago.proyecto_id",
            "conduce.numero_referencia as conduce_numero_referencia",
            "proyecto.referencia as proyecto_referencia",
         ])
         .where((eb) =>
            eb.or([
               eb(
                  "pago.conduce_id",
                  "in",
                  eb
                     .selectFrom("conduce")
                     .select("id")
                     .where("conduce.cliente_id", "=", clienteId)
                     .where("conduce.deleted_at", "is", null)
               ),
               eb(
                  "pago.proyecto_id",
                  "in",
                  eb.selectFrom("proyecto").select("id").where("proyecto.cliente_id", "=", clienteId)
               ),
            ])
         )
         .where("pago.deleted_at", "is", null)
         .orderBy("pago.fecha", "desc")
         .orderBy("pago.created_at", "desc")
         .limit(200)
         .execute();

      return {
         cliente: {
            id: cliente.id,
            nombre: cliente.nombre,
            telefono: cliente.telefono ?? null,
            email: cliente.email ?? null,
            identificacion: cliente.identificacion,
         },
         resumen: {
            facturado,
            pagado,
            pendiente: Math.max(0, facturado - pagado),
            cantidad_documentos: folios.length,
            documentos_pendientes,
            antiguedad,
         },
         cuentas: folios,
         historial_pagos: historial.map((p) => this.#mapPago(p)),
         total: folios.length,
         page,
         pageSize,
      };
   }

   async listarPendientesCliente(clienteId: string): Promise<CuentaPorCobrar[]> {
      const folios = await this.#listarFoliosCobrables({ cliente_id: clienteId, incluir_pagadas: true });

      const tienePendiente = (f: CuentaPorCobrar) =>
         f.pendiente > 0.01 ||
         f.pendiente_tarifa_cargos > 0.01 ||
         f.conduces.some((c) => c.pendiente > 0.01);

      return folios
         .filter(tienePendiente)
         .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
   }

   async crearPagos(pagos: Array<{
      destino_id: string;
      tipo: TipoCuentaCxc;
      monto_pagado: number;
      metodo_pago: string;
      fecha: Date;
      concepto: string;
   }>): Promise<PagoCxc[]> {
      if (pagos.length === 0) return [];

      const insertados = await this.db.transaction().execute(async (trx) => {
         const filas = [];
         for (const p of pagos) {
            const row = await trx
               .insertInto("pago")
               .values({
                  conduce_id: p.tipo === "CONDUCE" ? p.destino_id : null,
                  proyecto_id: p.tipo === "PROYECTO" ? p.destino_id : null,
                  monto_pagado: p.monto_pagado,
                  metodo_pago: p.metodo_pago,
                  tipo_movimiento: "ENTRADA",
                  concepto: p.concepto,
                  fecha: p.fecha,
                  created_at: new Date(),
                  updated_at: new Date(),
               } as any)
               .returning([
                  "id",
                  "referencia",
                  "conduce_id",
                  "proyecto_id",
                  "monto_pagado",
                  "metodo_pago",
                  "fecha",
                  "concepto",
                  "created_at",
                  "deleted_at",
               ])
               .executeTakeFirstOrThrow();
            filas.push(row);
         }
         return filas;
      });

      if (insertados.length === 0) return [];

      const conduceIds = insertados.filter((i) => i.conduce_id).map((i) => i.conduce_id as string);
      const proyectoIds = insertados.filter((i) => i.proyecto_id).map((i) => i.proyecto_id as string);

      const [folios, proyectos] = await Promise.all([
         conduceIds.length > 0
            ? this.db
                 .selectFrom("conduce")
                 .select(["id", "numero_referencia"])
                 .where("id", "in", conduceIds)
                 .execute()
            : [],
         proyectoIds.length > 0
            ? this.db.selectFrom("proyecto").select(["id", "referencia"]).where("id", "in", proyectoIds).execute()
            : [],
      ]);

      const conduceRef = new Map(folios.map((f) => [f.id, f.numero_referencia]));
      const proyectoRef = new Map(
         proyectos.map((p) => [p.id, codigoProyecto(Number(p.referencia))])
      );

      return insertados.map((p) =>
         this.#mapPago({
            ...p,
            conduce_numero_referencia: p.conduce_id ? (conduceRef.get(p.conduce_id) ?? null) : null,
            proyecto_codigo_referencia: p.proyecto_id ? (proyectoRef.get(p.proyecto_id) ?? null) : null,
         })
      );
   }

   /**
    * Folios cobrables de un proyecto o de un conduce suelto, con su cobrado.
    *
    * Un folio PROYECTO suma tarifa_servicio + cargos cobrables
    * (proyecto_detalle.es_cobrable) + conduces cobrables. Los pagos que lo
    * saldan vienen de dos canales: `pago.conduce_id` (sus conduces) y
    * `pago.proyecto_id` (tarifa/cargos) — ver la nota del domain.
    */
   async #listarFoliosCobrables(filtros: CuentasPorCobrarFiltros): Promise<CuentaPorCobrar[]> {
      const pagadoDe = (idRef: string) => sql<string>`(
         select coalesce(sum(p.monto_pagado), 0)
         from pago p
         where p.conduce_id = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      const ultimoPagoDe = (idRef: string) => sql<string | null>`(
         select max(p.fecha)
         from pago p
         where p.conduce_id = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      const cantPagosDe = (idRef: string) => sql<string>`(
         select count(*)
         from pago p
         where p.conduce_id = ${sql.raw(idRef)}
           and p.deleted_at is null
      )`;

      // ── A) Folios de proyecto ─────────────────────────────────────────────
      const subCargos = sql<number>`(select coalesce(sum(pd.subtotal), 0) from proyecto_detalle pd where pd.proyecto_id = "proyecto".id and pd.es_cobrable)`;
      const subConducesSum = sql<number>`(select coalesce(sum(cc.subtotal), 0) from conduce cc where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null)`;
      const subConducesCount = sql<number>`(select count(*)::int from conduce cc where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null)`;
      const subPagadoProyecto = sql<number>`(select coalesce(sum(p.monto_pagado), 0) from pago p where p.proyecto_id = "proyecto".id and p.deleted_at is null)`;
      const subPagadoConduces = sql<number>`(select coalesce(sum(p.monto_pagado), 0) from pago p join conduce cc on cc.id = p.conduce_id where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null and p.deleted_at is null)`;

      const proyectos = await this.db
         .selectFrom("proyecto")
         .innerJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.referencia",
            "proyecto.nombre",
            "proyecto.fecha_inicio",
            "proyecto.cliente_id",
            "cliente.nombre as cliente_nombre",
            "cliente.telefono as cliente_telefono",
            "cliente.email as cliente_email",
            sql<number>`coalesce("proyecto".tarifa_servicio, 0)`.as("tarifa_servicio"),
            subCargos.as("cargos_cobrables"),
            subConducesSum.as("conduces_cobrables"),
            subConducesCount.as("conduces_count"),
            subPagadoProyecto.as("pagado_proyecto"),
            subPagadoConduces.as("pagado_conduces"),
            sql<string>`(select max(p.fecha) from pago p where p.proyecto_id = "proyecto".id and p.deleted_at is null)`.as("ultimo_pago_proyecto"),
            sql<string>`(select max(p.fecha) from pago p join conduce cc on cc.id = p.conduce_id where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null and p.deleted_at is null)`.as("ultimo_pago_conduce"),
            sql<number>`(select count(*)::int from pago p where p.proyecto_id = "proyecto".id and p.deleted_at is null)`.as("cant_pagos_proyecto"),
            sql<number>`(select count(*)::int from pago p join conduce cc on cc.id = p.conduce_id where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null and p.deleted_at is null)`.as("cant_pagos_conduces"),
         ])
         .where((eb) =>
            eb.or([
               eb(sql`coalesce("proyecto".tarifa_servicio, 0)`, ">", 0),
               eb(sql`(select coalesce(sum(pd.subtotal), 0) from proyecto_detalle pd where pd.proyecto_id = "proyecto".id and pd.es_cobrable)`, ">", 0),
               eb(sql`(select count(*) from conduce cc where cc.proyecto_id = "proyecto".id and cc.es_cobrable and cc.deleted_at is null)`, ">", 0),
            ])
         )
         .$if(!!filtros.cliente_id, (q) => q.where("proyecto.cliente_id", "=", filtros.cliente_id as string))
         .$if(!!filtros.proyecto_id, (q) => q.where("proyecto.id", "=", filtros.proyecto_id as string))
         .$if(!!filtros.fecha_desde, (q) => q.where("proyecto.fecha_inicio", ">=", filtros.fecha_desde as any))
         .$if(!!filtros.fecha_hasta, (q) => q.where("proyecto.fecha_inicio", "<", siguienteDiaISO(filtros.fecha_hasta as string) as any))
         .$if(!!filtros.busqueda, (q) => {
            const b = `%${filtros.busqueda}%`;
            return q.where((eb) =>
               eb.or([
                  eb("cliente.nombre", "ilike", b),
                  eb("proyecto.nombre", "ilike", b),
                  eb(eb.cast("proyecto.referencia", "text"), "ilike", b),
               ])
            );
         })
         .orderBy("proyecto.fecha_inicio", "asc")
         .execute();

      // Detalle de conduces de esos proyectos (con su cobrado individual).
      const proyectoIds = proyectos.map((p) => p.id as string);
      let detalleConduces: Array<Record<string, unknown> & { proyecto_id: string }> = [];
      if (proyectoIds.length > 0) {
         const rows = await this.db
            .selectFrom("conduce")
            .select([
               "conduce.id",
               "conduce.proyecto_id",
               "conduce.numero_referencia",
               "conduce.tipo_conduce",
               "conduce.fecha",
               "conduce.categoria_equipo_tarifa_nombre",
               "conduce.medida_cobro_nombre",
               "conduce.subtotal",
               sql<number>`(select coalesce(sum(p.monto_pagado), 0) from pago p where p.conduce_id = "conduce".id and p.deleted_at is null)`.as("pagado"),
            ])
            .where("conduce.proyecto_id", "in", proyectoIds)
            .where("conduce.es_cobrable", "=", true)
            .where("conduce.deleted_at", "is", null)
            .orderBy("conduce.fecha", "asc")
            .execute();
         detalleConduces = rows as Array<Record<string, unknown> & { proyecto_id: string }>;
      }

      // ── B) Conduces sueltos (sin proyecto) ────────────────────────────────
      const sueltos = await this.db
         .selectFrom("conduce")
         .innerJoin("cliente", "cliente.id", "conduce.cliente_id")
         .select([
            "conduce.id",
            "conduce.numero_referencia",
            "conduce.tipo_conduce",
            "conduce.fecha",
            "conduce.cliente_id",
            "cliente.nombre as cliente_nombre",
            "cliente.telefono as cliente_telefono",
            "cliente.email as cliente_email",
            "conduce.categoria_equipo_tarifa_nombre",
            "conduce.medida_cobro_nombre",
            "conduce.subtotal",
            pagadoDe("conduce.id").as("pagado"),
            ultimoPagoDe("conduce.id").as("ultimo_pago_fecha"),
            cantPagosDe("conduce.id").as("cantidad_pagos"),
         ])
         .where("conduce.proyecto_id", "is", null)
         .where("conduce.es_cobrable", "=", true)
         .where("conduce.deleted_at", "is", null)
         .$if(!!filtros.cliente_id, (q) => q.where("conduce.cliente_id", "=", filtros.cliente_id as string))
         .$if(!!filtros.fecha_desde, (q) => q.where("conduce.fecha", ">=", filtros.fecha_desde as any))
         .$if(!!filtros.fecha_hasta, (q) => q.where("conduce.fecha", "<", siguienteDiaISO(filtros.fecha_hasta as string) as any))
         .$if(!!filtros.busqueda, (q) => {
            const b = `%${filtros.busqueda}%`;
            return q.where((eb) =>
               eb.or([
                  eb("cliente.nombre", "ilike", b),
                  eb("conduce.numero_referencia", "ilike", b),
               ])
            );
         })
         .orderBy("conduce.fecha", "asc")
         .execute();

      const folios: CuentaPorCobrar[] = [
         ...proyectos.map((p) => this.#mapFolioProyecto(p, detalleConduces)),
         ...sueltos.map((s) => this.#mapFolioConduceSuelto(s)),
      ];

      return folios.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
   }

   #mapFolioProyecto(
      row: Record<string, unknown>,
      detalleConduces: Array<Record<string, unknown> & { proyecto_id: string }>
   ): CuentaPorCobrar {
      const tarifa = num(row.tarifa_servicio);
      const cargos = num(row.cargos_cobrables);
      const conducesTotal = num(row.conduces_cobrables);
      const pagadoProyecto = num(row.pagado_proyecto);
      const pagadoConduces = num(row.pagado_conduces);
      const montoTotal = tarifa + cargos + conducesTotal;
      const pagado = pagadoProyecto + pagadoConduces;

      const conduces: ConduceDetalleCxc[] = detalleConduces
         .filter((d) => d.proyecto_id === (row.id as string))
         .map((d) => {
            const monto = num(d.subtotal);
            const cobrado = num(d.pagado);
            return {
               id: d.id as string,
               numero_referencia: d.numero_referencia as string,
               tipo_conduce: d.tipo_conduce as string,
               fecha: new Date(d.fecha as string),
               categoria_equipo_tarifa_nombre: (d.categoria_equipo_tarifa_nombre as string | null) ?? null,
               medida_cobro_nombre: (d.medida_cobro_nombre as string | null) ?? null,
               monto_total: monto,
               pagado: cobrado,
               pendiente: Math.max(0, monto - cobrado),
            };
         });

      const ultimoPago = this.#maxDate(row.ultimo_pago_proyecto, row.ultimo_pago_conduce);

      return {
         id: row.id as string,
         tipo: "PROYECTO",
         numero_referencia: codigoProyecto(Number(row.referencia)),
         nombre: (row.nombre as string | null) ?? null,
         fecha: new Date(row.fecha_inicio as string),
         proyecto_id: row.id as string,
         cliente_id: row.cliente_id as string,
         cliente_nombre: (row.cliente_nombre as string | null) ?? null,
         cliente_telefono: (row.cliente_telefono as string | null) ?? null,
         cliente_email: (row.cliente_email as string | null) ?? null,
         tarifa_servicio: tarifa,
         cargos_cobrables: cargos,
         conduces_cobrables: conducesTotal,
         conduces_count: num(row.conduces_count),
         monto_total: montoTotal,
         pagado,
         pendiente: Math.max(0, montoTotal - pagado),
         pendiente_tarifa_cargos: Math.max(0, tarifa + cargos - pagadoProyecto),
         estado: estadoDeCuenta(montoTotal, pagado),
         dias_transcurridos: diasDesde(row.fecha_inicio as string),
         ultimo_pago_fecha: ultimoPago,
         cantidad_pagos: num(row.cant_pagos_proyecto) + num(row.cant_pagos_conduces),
         conduces,
      };
   }

   #mapFolioConduceSuelto(row: Record<string, unknown>): CuentaPorCobrar {
      const monto = num(row.subtotal);
      const pagado = num(row.pagado);

      const conduce: ConduceDetalleCxc = {
         id: row.id as string,
         numero_referencia: row.numero_referencia as string,
         tipo_conduce: row.tipo_conduce as string,
         fecha: new Date(row.fecha as string),
         categoria_equipo_tarifa_nombre: (row.categoria_equipo_tarifa_nombre as string | null) ?? null,
         medida_cobro_nombre: (row.medida_cobro_nombre as string | null) ?? null,
         monto_total: monto,
         pagado,
         pendiente: Math.max(0, monto - pagado),
      };

      return {
         id: row.id as string,
         tipo: "CONDUCE",
         numero_referencia: row.numero_referencia as string,
         nombre: null,
         fecha: new Date(row.fecha as string),
         proyecto_id: null,
         cliente_id: row.cliente_id as string,
         cliente_nombre: (row.cliente_nombre as string | null) ?? null,
         cliente_telefono: (row.cliente_telefono as string | null) ?? null,
         cliente_email: (row.cliente_email as string | null) ?? null,
         tarifa_servicio: 0,
         cargos_cobrables: 0,
         conduces_cobrables: monto,
         conduces_count: 1,
         monto_total: monto,
         pagado,
         pendiente: Math.max(0, monto - pagado),
         pendiente_tarifa_cargos: 0,
         estado: estadoDeCuenta(monto, pagado),
         dias_transcurridos: diasDesde(row.fecha as string),
         ultimo_pago_fecha: row.ultimo_pago_fecha ? new Date(row.ultimo_pago_fecha as string) : null,
         cantidad_pagos: num(row.cantidad_pagos),
         conduces: [conduce],
      };
   }

   #maxDate(a: unknown, b: unknown): Date | null {
      const da = a ? new Date(a as string) : null;
      const db = b ? new Date(b as string) : null;
      if (!da && !db) return null;
      if (!da) return db;
      if (!db) return da;
      return da > db ? da : db;
   }

   /** El resumen describe TODO lo filtrado, no solo la página visible. */
   #resumir(filas: ClienteCuentaPorCobrar[]): ResumenCuentasPorCobrar {
      const r: ResumenCuentasPorCobrar = {
         total_clientes: filas.length,
         clientes_con_deuda: 0,
         total_documentos: 0,
         total_facturado: 0,
         total_pagado: 0,
         total_pendiente: 0,
         pendientes: 0,
         parciales: 0,
         documentos_pendientes: 0,
         antiguedad: { hasta_30: 0, de_31_a_60: 0, de_61_a_90: 0, mas_de_90: 0 },
      };

      for (const f of filas) {
         r.total_facturado += f.total_facturado;
         r.total_pagado += f.total_pagado;
         r.total_pendiente += f.saldo_pendiente;
         r.total_documentos += f.cantidad_documentos;
         r.documentos_pendientes += f.documentos_pendientes;

         if (f.saldo_pendiente > 0.01) r.clientes_con_deuda += 1;
         if (f.estado === "PENDIENTE") r.pendientes++;
         if (f.estado === "PARCIAL") r.parciales++;

         r.antiguedad.hasta_30 += f.antiguedad.hasta_30;
         r.antiguedad.de_31_a_60 += f.antiguedad.de_31_a_60;
         r.antiguedad.de_61_a_90 += f.antiguedad.de_61_a_90;
         r.antiguedad.mas_de_90 += f.antiguedad.mas_de_90;
      }

      return r;
   }

   #mapPago(p: any): PagoCxc {
      return {
         id: p.id,
         referencia: num(p.referencia),
         codigoReferencia: `PAG-${String(p.referencia).padStart(3, "0")}`,
         conduce_id: p.conduce_id ?? null,
         conduce_numero_referencia: p.conduce_numero_referencia ?? null,
         proyecto_id: p.proyecto_id ?? null,
         proyecto_codigo_referencia:
            p.proyecto_codigo_referencia ??
            (p.proyecto_referencia != null ? codigoProyecto(num(p.proyecto_referencia)) : null),
         monto_pagado: num(p.monto_pagado),
         metodo_pago: p.metodo_pago,
         fecha: new Date(p.fecha),
         concepto: p.concepto,
         created_at: new Date(p.created_at),
         deleted_at: p.deleted_at ? new Date(p.deleted_at) : null,
      };
   }
}
