import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import {
   ISubcontratacionRepository,
   SubcontratacionesFiltros,
   SubcontratacionesResult,
   SubcontratacionProps,
   ResumenSubcontrataciones,
   EstadoTrabajo,
   EstadoPago,
   CreateSubcontratacionDTO,
   UpdateSubcontratacionDTO,
   CambiarEstadoDTO,
   CrearPagoDTO,
   CrearApunteDTO,
   SubcontratacionApunte,
} from "../domain/subcontratacion.domain";
import { estadoDePago } from "../domain/subcontratacion.domain";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

function aFechaISO(v: Date | string): string {
   if (typeof v === "string") return v.slice(0, 10);
   const y = v.getFullYear();
   const m = String(v.getMonth() + 1).padStart(2, "0");
   const d = String(v.getDate()).padStart(2, "0");
   return `${y}-${m}-${d}`;
}

function aDate(v: unknown): Date | null {
   if (v == null) return null;
   const d = v instanceof Date ? v : new Date(v as string);
   return isNaN(d.getTime()) ? null : d;
}

export class KyselySubcontratacionRepository implements ISubcontratacionRepository {
   constructor(private readonly db: Kysely<DB>) { }

   // ── Queries base ───────────────────────────────────────────────────────────

   private buildBaseQuery() {
      return this.db
         .selectFrom("subcontratacion")
         .leftJoin("proveedor", "proveedor.id", "subcontratacion.proveedor_id")
         .leftJoin("proyecto", "proyecto.id", "subcontratacion.proyecto_id")
         .leftJoin("equipo", "equipo.id", "subcontratacion.equipo_id")
         .leftJoin("gasto", "gasto.id", "subcontratacion.gasto_id")
         .leftJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
         .where("subcontratacion.deleted_at", "is", null);
   }

   private buildSelect(query: any) {
      // El pagado se calcula con subselects correlacionados en vez de JOIN +
      // GROUP BY: con el join, una subcontratación con varios pagos se
      // duplicaría. El gasto vinculado vive en subcontratacion.gasto_id, así el
      // subselect no depende del join con `gasto` (aunque exista por el
      // codigo de referencia).
      const pagado = sql<string>`(
         select coalesce(sum(p.monto_pagado), 0)
         from pago p
         where p.gasto_empresa_id = subcontratacion.gasto_id
           and p.deleted_at is null
      )`;
      const ultimoPago = sql<Date | null>`(
         select max(p.fecha)
         from pago p
         where p.gasto_empresa_id = subcontratacion.gasto_id
           and p.deleted_at is null
      )`;
      const cantPagos = sql<string>`(
         select count(*)
         from pago p
         where p.gasto_empresa_id = subcontratacion.gasto_id
           and p.deleted_at is null
      )`;

      return query.selectAll("subcontratacion").select([
         "proveedor.nombre as proveedor_nombre",
         "proveedor.tipo as proveedor_tipo",
         "proveedor.rnc as proveedor_rnc",
         "proyecto.nombre as proyecto_nombre",
         "equipo.nombre as equipo_nombre",
         "equipo.referencia as equipo_referencia",
         "gasto.referencia as gasto_referencia",
         "gasto.categoria_gasto_id as categoria_gasto_id",
         "categoria_gasto.nombre as categoria_gasto_nombre",
         pagado.as("pagado"),
         ultimoPago.as("ultimo_pago_fecha"),
         cantPagos.as("cantidad_pagos"),
      ]);
   }

   private mapToEntity(row: any): SubcontratacionProps {
      const monto = num(row.monto_total);
      const pagado = num(row.pagado);
      return {
         id: row.id,
         referencia: num(row.referencia),
         codigoReferencia: `SUB-${String(num(row.referencia)).padStart(3, "0")}`,
         proveedor_id: row.proveedor_id,
         proveedor_nombre: row.proveedor_nombre ?? null,
         proveedor_tipo: row.proveedor_tipo ?? null,
         proveedor_rnc: row.proveedor_rnc ?? null,
         proyecto_id: row.proyecto_id ?? null,
         proyecto_nombre: row.proyecto_nombre ?? null,
         equipo_id: row.equipo_id ?? null,
         equipo_nombre: row.equipo_nombre ?? null,
         equipo_codigo_referencia: row.equipo_referencia != null
            ? `EQU-${String(num(row.equipo_referencia)).padStart(3, "0")}`
            : null,
         trabajo_descripcion: row.trabajo_descripcion ?? null,
         monto_total: monto,
         estado_trabajo: row.estado as EstadoTrabajo,
         motivo_estado: row.motivo_estado ?? null,
         fecha_deuda: row.fecha_deuda,
         fecha_inicio: aDate(row.fecha_inicio),
         fecha_fin: aDate(row.fecha_fin),
         observaciones: row.observaciones ?? null,
         gasto_id: row.gasto_id ?? null,
         gasto_codigo_referencia: row.gasto_referencia != null
            ? `GAS-${String(num(row.gasto_referencia)).padStart(3, "0")}`
            : null,
         categoria_gasto_id: row.categoria_gasto_id ?? null,
         categoria_gasto_nombre: row.categoria_gasto_nombre ?? null,
         pagado,
         pendiente: Math.max(0, monto - pagado),
         estado_pago: estadoDePago(monto, pagado),
         ultimo_pago_fecha: aDate(row.ultimo_pago_fecha),
         cantidad_pagos: num(row.cantidad_pagos),
         created_by: row.created_by ?? null,
         created_by_name: row.created_by_name ?? null,
         created_at: row.created_at,
         updated_at: row.updated_at,
         deleted_by: row.deleted_by ?? null,
         deleted_at: aDate(row.deleted_at),
         deleted_reason: row.deleted_reason ?? null,
      };
   }

   // ── Listado ────────────────────────────────────────────────────────────────

   async listar(filtros: SubcontratacionesFiltros): Promise<SubcontratacionesResult> {
      const page = filtros.page && filtros.page > 0 ? filtros.page : 1;
      const pageSize = filtros.pageSize && filtros.pageSize > 0 ? filtros.pageSize : 25;

      let q = this.buildBaseQuery();
      q = this.buildSelect(q);

      if (filtros.proveedor_id) q = q.where("subcontratacion.proveedor_id", "=", filtros.proveedor_id);
      if (filtros.proyecto_id) q = q.where("subcontratacion.proyecto_id", "=", filtros.proyecto_id);
      if (filtros.equipo_id) q = q.where("subcontratacion.equipo_id", "=", filtros.equipo_id);
      if (filtros.estado_trabajo) q = q.where("subcontratacion.estado", "=", filtros.estado_trabajo);
      if (filtros.fecha_desde) q = q.where("subcontratacion.fecha_deuda", ">=", aFechaISO(filtros.fecha_desde) as any);
      if (filtros.fecha_hasta) q = q.where("subcontratacion.fecha_deuda", "<=", aFechaISO(filtros.fecha_hasta) as any);
      if (filtros.busqueda) {
         const b = `%${filtros.busqueda}%`;
         q = q.where((eb) =>
            eb.or([
               eb("subcontratacion.trabajo_descripcion", "ilike", b),
               eb("subcontratacion.observaciones", "ilike", b),
               eb("proveedor.nombre", "ilike", b),
               eb(sql`subcontratacion.referencia::text`, "ilike", b),
               eb(sql`concat('SUB-', lpad(subcontratacion.referencia::text, 3, '0'))`, "ilike", b),
            ])
         );
      }

      const filas: SubcontratacionProps[] = [];
      for (const r of await q.execute()) filas.push(this.mapToEntity(r));

      // El estado de pago se deriva en memoria (depende de la suma de pagos).
      let resultado = filas;
      if (filtros.estado_pago) {
         resultado = resultado.filter((f) => f.estado_pago === filtros.estado_pago);
      } else if (!filtros.incluir_pagadas) {
         // Por defecto, como en Cuentas por Pagar, lo saldado no es deuda viva.
         resultado = resultado.filter((f) => f.estado_pago !== "PAGADO");
      }

      // Lo más viejo primero: es lo que más tiempo lleva sin pagarse.
      resultado.sort((a, b) => new Date(a.fecha_deuda).getTime() - new Date(b.fecha_deuda).getTime());

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

   #resumir(filas: SubcontratacionProps[]): ResumenSubcontrataciones {
      const r: ResumenSubcontrataciones = {
         total_documentos: filas.length,
         total_deuda: 0,
         total_pagado: 0,
         total_pendiente: 0,
         pendientes_trabajo: 0,
         en_progreso_trabajo: 0,
         terminadas_trabajo: 0,
         canceladas_trabajo: 0,
      };

      for (const f of filas) {
         r.total_deuda += f.monto_total;
         r.total_pagado += f.pagado;
         r.total_pendiente += f.pendiente;

         if (f.estado_trabajo === "PENDIENTE") r.pendientes_trabajo++;
         else if (f.estado_trabajo === "EN_PROGRESO") r.en_progreso_trabajo++;
         else if (f.estado_trabajo === "TERMINADA") r.terminadas_trabajo++;
         else if (f.estado_trabajo === "CANCELADA") r.canceladas_trabajo++;
      }

      return r;
   }

   // ── Detalle ────────────────────────────────────────────────────────────────

   async findById(id: string): Promise<SubcontratacionProps | null> {
      let q = this.buildBaseQuery();
      q = this.buildSelect(q);
      const row = await q.where("subcontratacion.id", "=", id).executeTakeFirst();
      return row ? this.mapToEntity(row) : null;
   }

   // ── Creación (genera el gasto vinculado) ───────────────────────────────────

   async create(
      data: CreateSubcontratacionDTO,
      ctx?: { created_by?: string | null; created_by_name?: string | null }
   ): Promise<SubcontratacionProps> {
      const now = new Date();
      const concepto = data.trabajo_descripcion?.trim() || "Subcontratación";

      // Transacción: el gasto y la subcontratación nacen juntos, y el gasto
      // queda señalado con subcontratacion_id (back-reference) para auditoría.
      const nuevoId = await this.db.transaction().execute(async (trx) => {
         const gasto = await trx
            .insertInto("gasto")
            .values({
               monto_total: data.monto_total,
               concepto,
               ncf: null,
               categoria_gasto_id: data.categoria_gasto_id,
               orden_compra_id: null,
               proyecto_id: data.proyecto_id ?? null,
               equipo_id: data.equipo_id ?? null,
               proveedor_id: data.proveedor_id,
               subcontratacion_id: null,
               fecha: data.fecha_deuda,
               created_at: now,
               updated_at: now,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         const sub = await trx
            .insertInto("subcontratacion")
            .values({
               proveedor_id: data.proveedor_id,
               proyecto_id: data.proyecto_id ?? null,
               equipo_id: data.equipo_id ?? null,
               trabajo_descripcion: data.trabajo_descripcion ?? null,
               monto_total: data.monto_total,
               estado: data.estado ?? "PENDIENTE",
               motivo_estado: data.estado === "PARADO" ? (data.motivo_estado?.trim() ?? null) : null,
               fecha_deuda: data.fecha_deuda,
               fecha_inicio: data.fecha_inicio ?? null,
               fecha_fin: data.fecha_fin ?? null,
               observaciones: data.observaciones ?? null,
               gasto_id: gasto.id,
               created_by: ctx?.created_by ?? null,
               created_by_name: ctx?.created_by_name ?? null,
               created_at: now,
               updated_at: now,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         await trx
            .updateTable("gasto")
            .set({ subcontratacion_id: sub.id, updated_at: now })
            .where("id", "=", gasto.id)
            .execute();

         return sub.id;
      });

      return (await this.findById(nuevoId))!;
   }

   // ── Actualización (sincroniza el gasto) ────────────────────────────────────

   async update(id: string, data: UpdateSubcontratacionDTO): Promise<SubcontratacionProps | null> {
      const sub = await this.db
         .selectFrom("subcontratacion")
         .selectAll()
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();
      if (!sub) return null;

      const monto = data.monto_total !== undefined ? data.monto_total : num(sub.monto_total);
      const fechaDeuda = data.fecha_deuda !== undefined ? data.fecha_deuda : sub.fecha_deuda;
      const descripcion = data.trabajo_descripcion !== undefined ? data.trabajo_descripcion : sub.trabajo_descripcion;

      const estadoNuevo = data.estado ?? sub.estado;
      const motivoEstado =
         data.motivo_estado !== undefined ? data.motivo_estado : sub.motivo_estado;
      const motivoFinal = estadoNuevo === "PARADO" ? (motivoEstado?.trim() ?? null) : null;

      await this.db.transaction().execute(async (trx) => {
         await trx
            .updateTable("subcontratacion")
            .set({
               proveedor_id: data.proveedor_id !== undefined ? data.proveedor_id : sub.proveedor_id,
               proyecto_id: data.proyecto_id !== undefined ? data.proyecto_id : sub.proyecto_id,
               equipo_id: data.equipo_id !== undefined ? data.equipo_id : sub.equipo_id,
               trabajo_descripcion: descripcion ?? null,
               monto_total: monto,
               estado: estadoNuevo,
               motivo_estado: motivoFinal,
               fecha_deuda: fechaDeuda,
               fecha_inicio: data.fecha_inicio !== undefined ? data.fecha_inicio : sub.fecha_inicio,
               fecha_fin: data.fecha_fin !== undefined ? data.fecha_fin : sub.fecha_fin,
               observaciones: data.observaciones !== undefined ? data.observaciones : sub.observaciones,
               updated_at: new Date(),
            })
            .where("id", "=", id)
            .execute();

         if (sub.gasto_id) {
            const gastoActual = await trx
               .selectFrom("gasto")
               .select(["categoria_gasto_id"])
               .where("id", "=", sub.gasto_id)
               .executeTakeFirst();

            await trx
               .updateTable("gasto")
               .set({
                  monto_total: monto,
                  fecha: fechaDeuda,
                  concepto: descripcion?.trim() || "Subcontratación",
                  proyecto_id: data.proyecto_id !== undefined ? data.proyecto_id : sub.proyecto_id,
                  equipo_id: data.equipo_id !== undefined ? data.equipo_id : sub.equipo_id,
                  proveedor_id: data.proveedor_id !== undefined ? data.proveedor_id : sub.proveedor_id,
                  categoria_gasto_id:
                     data.categoria_gasto_id !== undefined
                        ? data.categoria_gasto_id
                        : (gastoActual?.categoria_gasto_id ?? ""),
                  updated_at: new Date(),
               })
               .where("id", "=", sub.gasto_id)
               .execute();
         }
      });

      return this.findById(id);
   }

   // ── Estado del trabajo ─────────────────────────────────────────────────────

   async cambiarEstado(id: string, dto: CambiarEstadoDTO): Promise<SubcontratacionProps | null> {
      const { estado } = dto;
      const sub = await this.db
         .selectFrom("subcontratacion")
         .selectAll()
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();
      if (!sub) return null;

      const set: Record<string, unknown> = {
         estado,
         updated_at: new Date(),
      };

      // PARADO exige motivo; al salir del estado PARADO se limpia.
      if (estado === "PARADO") {
         set.motivo_estado = dto.motivo?.trim() ?? null;
      } else {
         set.motivo_estado = null;
      }

      // Al terminar/cancelar se cierra la duración si no estaba definida.
      if ((estado === "TERMINADA" || estado === "CANCELADA") && !sub.fecha_fin) {
         set.fecha_fin = new Date();
      }
      if (estado === "TERMINADA" && !sub.fecha_inicio) {
         set.fecha_inicio = sub.fecha_deuda;
      }

      await this.db
         .updateTable("subcontratacion")
         .set(set)
         .where("id", "=", id)
         .execute();

      return this.findById(id);
   }

   // ── Pagos (entran por la tabla `pago` contra el gasto vinculado) ───────────

   async pagar(id: string, data: CrearPagoDTO): Promise<SubcontratacionProps | null> {
      const sub = await this.db
         .selectFrom("subcontratacion")
         .selectAll()
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();
      if (!sub) return null;
      if (!sub.gasto_id) throw new Error("La subcontratación no tiene gasto vinculado");

      const ahora = new Date();
      await this.db
         .insertInto("pago")
         .values({
            metodo_pago: data.metodo_pago,
            monto_pagado: data.monto_pagado,
            concepto: data.concepto?.trim() || "Pago a subcontratista",
            tipo_movimiento: "SALIDA",
            gasto_empresa_id: sub.gasto_id,
            deduccion_empleado_id: null,
            proyecto_id: null,
            orden_compra_id: null,
            fecha: data.fecha,
            created_at: ahora,
            updated_at: ahora,
         })
         .execute();

      return this.findById(id);
   }

   async listarPagos(id: string): Promise<any[]> {
      const sub = await this.db
         .selectFrom("subcontratacion")
         .select("gasto_id")
         .where("id", "=", id)
         .executeTakeFirst();
      if (!sub?.gasto_id) return [];

      const rows = await this.db
         .selectFrom("pago")
         .selectAll()
         .where("gasto_empresa_id", "=", sub.gasto_id)
         .where("deleted_at", "is", null)
         .orderBy("fecha", "desc")
         .execute();

      return rows.map((r) => ({
         ...r,
         codigoReferencia: `PAG-${String(r.referencia).padStart(3, "0")}`,
         monto_pagado: num(r.monto_pagado),
      }));
   }

   // ── Apuntes ────────────────────────────────────────────────────────────────

   async listarApuntes(id: string): Promise<SubcontratacionApunte[]> {
      const rows = await this.db
         .selectFrom("subcontratacion_apunte")
         .selectAll()
         .where("subcontratacion_id", "=", id)
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((r) => ({
         id: r.id,
         subcontratacion_id: r.subcontratacion_id,
         texto: r.texto,
         created_by_name: r.created_by_name ?? null,
         created_at: r.created_at,
      }));
   }

   async crearApunte(
      id: string,
      data: CrearApunteDTO,
      ctx?: { created_by_name?: string | null }
   ): Promise<SubcontratacionApunte> {
      const row = await this.db
         .insertInto("subcontratacion_apunte")
         .values({
            subcontratacion_id: id,
            texto: data.texto,
            created_by_name: ctx?.created_by_name ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return {
         id: row.id,
         subcontratacion_id: row.subcontratacion_id,
         texto: row.texto,
         created_by_name: row.created_by_name ?? null,
         created_at: row.created_at,
      };
   }

   // ── Eliminación lógica ─────────────────────────────────────────────────────

   async delete(
      id: string,
      data?: { deleted_by?: string | null; deleted_reason?: string | null }
   ): Promise<boolean> {
      const result = await this.db
         .updateTable("subcontratacion")
         .set({
            deleted_at: new Date(),
            deleted_by: data?.deleted_by ?? null,
            deleted_reason: data?.deleted_reason ?? null,
         })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
   }

   async restore(id: string): Promise<SubcontratacionProps | null> {
      const result = await this.db
         .updateTable("subcontratacion")
         .set({ deleted_at: null, deleted_by: null, deleted_reason: null })
         .where("id", "=", id)
         .where("deleted_at", "is not", null)
         .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0 ? this.findById(id) : null;
   }
}
