import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   CloseMantenimientoDTO,
   CreateMantenimientoDTO,
   EstadoMantenimiento,
   IMantenimientoRepository,
   Mantenimiento,
   MantenimientoFilters,
   MantenimientoGastoProps,
   MantenimientoProps,
   TipoMantenimiento,
   UpdateMantenimientoDTO,
} from "../domain/mantenimiento.domain";

/** Postgres DATE columns must not pick up a timezone shift on the way in. */
function toDateOnly(value: Date | string): Date {
   if (value instanceof Date) return value;
   // "2026-07-27" parsed as UTC midnight would slide a day back in UTC-4.
   const [y, m, d] = value.slice(0, 10).split("-").map(Number);
   return new Date(y, m - 1, d);
}

export class KyselyMantenimientoRepository implements IMantenimientoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   private mapGastos(raw: any): MantenimientoGastoProps[] {
      if (!Array.isArray(raw)) return [];
      return raw
         .filter((g: any) => g && g.id)
         .map((g: any) => ({
            id: g.id,
            referencia: Number(g.referencia),
            codigoReferencia: `GAS-${String(Number(g.referencia)).padStart(3, "0")}`,
            concepto: g.concepto,
            monto_total: Number(g.monto_total),
            fecha: new Date(g.fecha),
            categoria_gasto_nombre: g.categoria_gasto_nombre ?? null,
         }))
         .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
   }

   private mapToEntity(row: any): Mantenimiento {
      const referencia = Number(row.referencia);
      return Mantenimiento.create({
         id: row.id,
         referencia,
         codigoReferencia: `MNT-${String(referencia).padStart(3, "0")}`,
         equipo_id: row.equipo_id,
         equipo_nombre: row.equipo_nombre,
         equipo_referencia: Number(row.equipo_referencia),
         equipo_placa: row.equipo_placa ?? null,
         tipo: row.tipo as TipoMantenimiento,
         estado: row.estado as EstadoMantenimiento,
         descripcion: row.descripcion,
         taller: row.taller,
         trabajo_realizado: row.trabajo_realizado,
         costo: row.costo == null ? null : Number(row.costo),
         gastos: this.mapGastos(row.gastos),
         fecha_inicio: new Date(row.fecha_inicio),
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin) : null,
         created_by: row.created_by,
         created_by_name: row.created_by_name,
         closed_by: row.closed_by,
         closed_by_name: row.closed_by_name,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   private baseQuery() {
      return this.db
         .selectFrom("mantenimiento")
         .innerJoin("equipo", "equipo.id", "mantenimiento.equipo_id")
         .select((eb) => [
            "mantenimiento.id",
            "mantenimiento.referencia",
            "mantenimiento.equipo_id",
            "equipo.nombre as equipo_nombre",
            "equipo.referencia as equipo_referencia",
            "equipo.placa as equipo_placa",
            "mantenimiento.tipo",
            "mantenimiento.estado",
            "mantenimiento.descripcion",
            "mantenimiento.taller",
            "mantenimiento.trabajo_realizado",
            "mantenimiento.costo",
            "mantenimiento.fecha_inicio",
            "mantenimiento.fecha_fin",
            "mantenimiento.created_by",
            "mantenimiento.created_by_name",
            "mantenimiento.closed_by",
            "mantenimiento.closed_by_name",
            "mantenimiento.created_at",
            "mantenimiento.updated_at",
            // Subconsulta en vez de join+groupBy: los gastos son varios por
            // mantenimiento y un join multiplicaría las filas.
            eb
               .selectFrom("mantenimiento_gasto as mg")
               .innerJoin("gasto as g", "g.id", "mg.gasto_id")
               .leftJoin("categoria_gasto as cg", "cg.id", "g.categoria_gasto_id")
               .whereRef("mg.mantenimiento_id", "=", "mantenimiento.id")
               .where("g.deleted_at", "is", null)
               .select(
                  sql<any>`coalesce(json_agg(json_build_object(
                     'id', g.id,
                     'referencia', g.referencia,
                     'concepto', g.concepto,
                     'monto_total', g.monto_total,
                     'fecha', g.fecha,
                     'categoria_gasto_nombre', cg.nombre
                  )), '[]'::json)`.as("gastos")
               )
               .as("gastos"),
         ]);
   }

   async findAll(params?: MantenimientoFilters): Promise<Mantenimiento[]> {
      const { page = 1, limit = 10, search = "", equipo_id, estado, tipo, start, end } = params || {};

      let qb = this.baseQuery();

      if (search) {
         qb = qb.where((eb) =>
            eb.or([
               eb("mantenimiento.descripcion", "ilike", `%${search}%`),
               eb("mantenimiento.taller", "ilike", `%${search}%`),
               eb("equipo.nombre", "ilike", `%${search}%`),
               eb("equipo.placa", "ilike", `%${search}%`),
            ])
         );
      }
      if (equipo_id) qb = qb.where("mantenimiento.equipo_id", "=", equipo_id);
      if (estado) qb = qb.where("mantenimiento.estado", "=", estado);
      if (tipo) qb = qb.where("mantenimiento.tipo", "=", tipo);
      if (start) qb = qb.where("mantenimiento.fecha_inicio", ">=", start);
      if (end) qb = qb.where("mantenimiento.fecha_inicio", "<=", end);

      const rows = await qb
         .orderBy("mantenimiento.fecha_inicio", "desc")
         .orderBy("mantenimiento.created_at", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Mantenimiento | null> {
      const row = await this.baseQuery()
         .where("mantenimiento.id", "=", id)
         .executeTakeFirst();
      return row ? this.mapToEntity(row) : null;
   }

   async findByEquipoId(equipoId: string): Promise<Mantenimiento[]> {
      const rows = await this.baseQuery()
         .where("mantenimiento.equipo_id", "=", equipoId)
         .orderBy("mantenimiento.fecha_inicio", "desc")
         .orderBy("mantenimiento.created_at", "desc")
         .execute();
      return rows.map((row) => this.mapToEntity(row));
   }

   async findAbiertoByEquipoId(equipoId: string): Promise<Mantenimiento | null> {
      const row = await this.baseQuery()
         .where("mantenimiento.equipo_id", "=", equipoId)
         .where("mantenimiento.fecha_fin", "is", null)
         .orderBy("mantenimiento.fecha_inicio", "desc")
         .executeTakeFirst();
      return row ? this.mapToEntity(row) : null;
   }

   /**
    * Reemplaza el conjunto de gastos enlazados y devuelve su suma. El costo del
    * mantenimiento se deriva de aquí: lo gastado de verdad manda sobre lo
    * declarado a mano.
    */
   private async syncGastos(
      trx: Kysely<DB>,
      mantenimientoId: string,
      gastoIds: string[]
   ): Promise<number | null> {
      await trx
         .deleteFrom("mantenimiento_gasto")
         .where("mantenimiento_id", "=", mantenimientoId)
         .execute();

      const unicos = [...new Set(gastoIds.filter(Boolean))];
      if (unicos.length === 0) return null;

      await trx
         .insertInto("mantenimiento_gasto")
         .values(unicos.map((gasto_id) => ({ mantenimiento_id: mantenimientoId, gasto_id })))
         .onConflict((oc) => oc.doNothing())
         .execute();

      const rows = await trx
         .selectFrom("gasto")
         .select("monto_total")
         .where("id", "in", unicos)
         .where("deleted_at", "is", null)
         .execute();

      return rows.reduce((acc, r) => acc + Number(r.monto_total), 0);
   }

   async create(data: CreateMantenimientoDTO): Promise<Mantenimiento> {
      const cerrado = data.fecha_fin != null;

      const id = await this.db.transaction().execute(async (trx) => {
         const gastoIds = [...(data.gasto_ids ?? [])];

         // Registro retroactivo que ya viene cerrado y con costo: el gasto se
         // crea aquí mismo para que no quede un mantenimiento pagado sin rastro.
         if (cerrado && data.crear_gasto && data.costo && data.costo > 0) {
            if (!data.categoria_gasto_id) {
               throw new Error("Categoría de gasto es requerida para crear el gasto");
            }
            const gasto = await trx
               .insertInto("gasto")
               .values({
                  monto_total: data.costo,
                  concepto: `Mantenimiento: ${data.descripcion}`,
                  categoria_gasto_id: data.categoria_gasto_id,
                  equipo_id: data.equipo_id,
                  fecha: data.fecha_fin ? toDateOnly(data.fecha_fin) : new Date(),
               })
               .returning("id")
               .executeTakeFirstOrThrow();
            gastoIds.push(gasto.id);
         }

         const row = await trx
            .insertInto("mantenimiento")
            .values({
               equipo_id: data.equipo_id,
               tipo: data.tipo ?? "CORRECTIVO",
               estado: cerrado ? "COMPLETADO" : "EN_PROCESO",
               descripcion: data.descripcion,
               taller: data.taller ?? null,
               trabajo_realizado: data.trabajo_realizado ?? null,
               costo: data.costo ?? null,
               fecha_inicio: data.fecha_inicio ? toDateOnly(data.fecha_inicio) : new Date(),
               fecha_fin: data.fecha_fin ? toDateOnly(data.fecha_fin) : null,
               created_by: data.created_by ?? null,
               created_by_name: data.created_by_name ?? null,
               closed_by: cerrado ? data.created_by ?? null : null,
               closed_by_name: cerrado ? data.created_by_name ?? null : null,
            })
            .returning("id")
            .executeTakeFirstOrThrow();

         if (gastoIds.length > 0) {
            const suma = await this.syncGastos(trx as unknown as Kysely<DB>, row.id, gastoIds);
            if (suma != null) {
               await trx
                  .updateTable("mantenimiento")
                  .set({ costo: suma })
                  .where("id", "=", row.id)
                  .execute();
            }
         }

         return row.id;
      });

      const created = await this.findById(id);
      if (!created) throw new Error("Error al crear mantenimiento");
      return created;
   }

   async update(id: string, data: UpdateMantenimientoDTO): Promise<Mantenimiento | null> {
      await this.db.transaction().execute(async (trx) => {
         const updateData: Record<string, unknown> = { updated_at: new Date() };

         if (data.tipo !== undefined) updateData.tipo = data.tipo;
         if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
         if (data.taller !== undefined) updateData.taller = data.taller;
         if (data.trabajo_realizado !== undefined) updateData.trabajo_realizado = data.trabajo_realizado;
         if (data.costo !== undefined) updateData.costo = data.costo;
         if (data.fecha_inicio !== undefined) updateData.fecha_inicio = toDateOnly(data.fecha_inicio);
         if (data.fecha_fin !== undefined) {
            updateData.fecha_fin = data.fecha_fin == null ? null : toDateOnly(data.fecha_fin);
            updateData.estado = data.fecha_fin == null ? "EN_PROCESO" : "COMPLETADO";
         }

         // Los gastos enlazados mandan sobre el costo declarado.
         if (data.gasto_ids !== undefined) {
            const suma = await this.syncGastos(trx as unknown as Kysely<DB>, id, data.gasto_ids);
            if (suma != null) updateData.costo = suma;
         }

         await trx
            .updateTable("mantenimiento")
            .set(updateData)
            .where("id", "=", id)
            .execute();
      });

      return this.findById(id);
   }

   async close(id: string, data: CloseMantenimientoDTO): Promise<Mantenimiento | null> {
      const closed = await this.db.transaction().execute(async (trx) => {
         const current = await trx
            .selectFrom("mantenimiento")
            .select(["id", "equipo_id", "descripcion", "fecha_fin"])
            .where("id", "=", id)
            .executeTakeFirst();

         if (!current) return false;
         if (current.fecha_fin !== null) {
            throw new Error("Este mantenimiento ya fue cerrado");
         }

         const fechaFin = data.fecha_fin ? toDateOnly(data.fecha_fin) : new Date();
         const gastoIds = [...(data.gasto_ids ?? [])];

         // Enlazar gastos existentes y crear uno nuevo no son excluyentes: se
         // puede tener la factura del taller ya capturada y añadir los repuestos.
         if (data.crear_gasto) {
            const monto = Number(data.monto_gasto_nuevo ?? data.costo ?? 0);
            if (monto > 0) {
               if (!data.categoria_gasto_id) {
                  throw new Error("Categoría de gasto es requerida para crear el gasto");
               }
               const gasto = await trx
                  .insertInto("gasto")
                  .values({
                     monto_total: monto,
                     concepto: `Mantenimiento: ${current.descripcion}`,
                     categoria_gasto_id: data.categoria_gasto_id,
                     equipo_id: current.equipo_id,
                     fecha: fechaFin,
                  })
                  .returning("id")
                  .executeTakeFirstOrThrow();
               gastoIds.push(gasto.id);
            }
         }

         const suma = await this.syncGastos(trx as unknown as Kysely<DB>, id, gastoIds);

         await trx
            .updateTable("mantenimiento")
            .set({
               estado: "COMPLETADO",
               trabajo_realizado: data.trabajo_realizado,
               // Con gastos enlazados el costo es su suma; si no hay, el declarado.
               costo: suma ?? data.costo ?? null,
               fecha_fin: fechaFin,
               closed_by: data.closed_by ?? null,
               closed_by_name: data.closed_by_name ?? null,
               updated_at: new Date(),
            })
            .where("id", "=", id)
            .execute();

         return true;
      });

      if (!closed) return null;
      return this.findById(id);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("mantenimiento")
         .where("id", "=", id)
         .executeTakeFirst();
      return Number(result.numDeletedRows) > 0;
   }
}
