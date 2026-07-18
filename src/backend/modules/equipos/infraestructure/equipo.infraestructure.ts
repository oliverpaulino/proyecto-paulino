import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateEquipoDTO,
   Equipo,
   EquipoCompraItemProps,
   EstadoEquipo,
   EstadoHistorialProps,
   IEquipoRepository,
   UpdateEquipoDTO,
} from "../domain/equipo.domain";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";

export class KyselyEquipoRepository implements IEquipoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   private buildCodigoReferencia(referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `EQU-${ref}`;
   }

   private mapToEntity(row: any): Equipo {
      return Equipo.create({
         id: row.id,
         referencia: row.referencia,
         codigoReferencia: this.buildCodigoReferencia(row.referencia),
         nombre: row.nombre,
         categoria_id: row.categoria_id,
         operador_id: row.operador_id,
         operador_nombre: row.operador_nombre ?? null,
         categoria_nombre: row.categoria_nombre,
         estado: row.estado as EstadoEquipo,
         costo_por_hora: Number(row.costo_por_hora),
         placa: row.placa,
         modelo: row.modelo,
         ano: row.ano == null ? null : Number(row.ano),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Equipo[]> {
      const { page = 1, limit = 10, search = "" } = params || {};

      let qb = this.db
         .selectFrom("equipo")
         .innerJoin("categoria_equipo", "categoria_equipo.id", "equipo.categoria_id")
         .leftJoin("operador", "operador.id", "equipo.operador_id")
         .leftJoin("empleado", "empleado.id", "operador.empleado_id")
         .select([
            "equipo.id",
            "equipo.referencia",
            "equipo.nombre",
            "equipo.categoria_id",
            "categoria_equipo.nombre as categoria_nombre",
            "equipo.estado",
            "equipo.costo_por_hora",
            "equipo.placa",
            "equipo.modelo",
            "equipo.ano",
            "equipo.operador_id",
            "empleado.nombre as operador_nombre",
            "equipo.created_at",
            "equipo.updated_at",
         ])
         .orderBy("equipo.created_at", "desc");

      if (search) {
         qb = qb.where((eb) =>
            eb.or([
               eb("equipo.nombre", "ilike", `%${search}%`),
               eb("categoria_equipo.nombre", "ilike", `%${search}%`),
            ])
         );
      }

      const rows = await qb.offset((page - 1) * limit).limit(limit).execute();
      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Equipo | null> {
      const row = await this.db
         .selectFrom("equipo")
         .innerJoin("categoria_equipo", "categoria_equipo.id", "equipo.categoria_id")
         .leftJoin("operador", "operador.id", "equipo.operador_id")
         .leftJoin("empleado", "empleado.id", "operador.empleado_id")
         .select([
            "equipo.id",
            "equipo.referencia",
            "equipo.nombre",
            "equipo.categoria_id",
            "categoria_equipo.nombre as categoria_nombre",
            "equipo.estado",
            "equipo.costo_por_hora",
            "equipo.placa",
            "equipo.modelo",
            "equipo.ano",
            "equipo.operador_id",
            "empleado.nombre as operador_nombre",
            "equipo.created_at",
            "equipo.updated_at",
         ])
         .where("equipo.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreateEquipoDTO): Promise<Equipo> {
      const row = await this.db
         .insertInto("equipo")
         .values({
            nombre: data.nombre,
            categoria_id: data.categoria_id,
            estado: data.estado ?? "ACTIVO",
            placa: data.placa ?? null,
            modelo: data.modelo ?? null,
            ano: data.ano ?? null,
            operador_id: data.operador_id ?? null,
         })
         .returning("id")
         .executeTakeFirstOrThrow();

      const created = await this.findById(row.id);
      if (!created) throw new Error("Error al crear equipo");
      return created;
   }

   async update(id: string, data: UpdateEquipoDTO): Promise<Equipo | null> {
      const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };

      await this.db
         .updateTable("equipo")
         .set(updateData)
         .where("id", "=", id)
         .execute();

      return this.findById(id);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("equipo")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   async findCategoriaByEquipoId(
      equipoId: string
   ): Promise<CategoriaEquipo | null> {
      const row = await this.db
         .selectFrom("equipo")
         .innerJoin("categoria_equipo as ce", "ce.id", "equipo.categoria_id")
         .leftJoin("categoria_equipo_tarifa as cet", "ce.id", "cet.categoria_equipo_id")
         .select(({ fn }) => [
            "ce.id",
            "ce.nombre",
            "ce.created_at",
            "ce.updated_at",
            fn.coalesce(
               fn.agg<any>("json_agg", [
                  sql`json_build_object(
                     'id', cet.id,
                     'nombre', cet.nombre,
                     'medida_cobro_id', cet.medida_cobro_id,
                     'precio_unitario', cet.precio_unitario,
                     'cobra_minimo', cet.cobra_minimo
                  )`
               ]).filterWhere("cet.id", "is not", null),
               sql`'[]'::json`
            ).as("tarifas")
         ])
         .where("equipo.id", "=", equipoId)
         .groupBy(["ce.id", "equipo.id"])
         .executeTakeFirst();

      if (!row) return null;

      // Aseguramos que la salida coincida perfectamente con el DTO CategoriaEquipo
      return {
         id: row.id,
         nombre: row.nombre,
         tarifas: row.tarifas,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      } as CategoriaEquipo;
   }

   async changeEstado(
      id: string,
      nuevoEstado: EstadoEquipo,
      changedBy?: string | null,
      changedByName?: string | null,
      nota?: string | null
   ): Promise<Equipo | null> {
      const changed = await this.db.transaction().execute(async (trx) => {
         const current = await trx
            .selectFrom("equipo")
            .select("estado")
            .where("id", "=", id)
            .executeTakeFirst();

         if (!current) return false;

         if (current.estado === nuevoEstado) return true;

         await trx
            .updateTable("equipo")
            .set({ estado: nuevoEstado, updated_at: new Date() })
            .where("id", "=", id)
            .execute();

         await trx
            .insertInto("equipo_estado_historial")
            .values({
               equipo_id: id,
               estado_anterior: current.estado,
               estado_nuevo: nuevoEstado,
               changed_by: changedBy ?? null,
               changed_by_name: changedByName ?? null,
               nota: nota ?? null,
            })
            .execute();

         return true;
      });

      if (!changed) return null;
      return this.findById(id);
   }

   async findHistorial(id: string): Promise<EstadoHistorialProps[]> {
      const rows = await this.db
         .selectFrom("equipo_estado_historial")
         .selectAll()
         .where("equipo_id", "=", id)
         .orderBy("created_at", "desc")
         .execute();

      return rows.map((r) => ({
         id: r.id,
         equipo_id: r.equipo_id,
         estado_anterior: (r.estado_anterior as EstadoEquipo | null) ?? null,
         estado_nuevo: r.estado_nuevo as EstadoEquipo,
         changed_by: r.changed_by,
         changed_by_name: r.changed_by_name,
         nota: r.nota,
         created_at: new Date(r.created_at),
      }));
   }

   async findComprasItems(id: string): Promise<EquipoCompraItemProps[]> {
      const rows = await this.db
         .selectFrom("orden_compra_item")
         .innerJoin("orden_compra", "orden_compra.id", "orden_compra_item.orden_compra_id")
         .select([
            "orden_compra_item.id",
            "orden_compra_item.orden_compra_id",
            "orden_compra.fecha as orden_fecha",
            "orden_compra.estado as orden_estado",
            "orden_compra_item.descripcion",
            "orden_compra_item.cantidad",
            "orden_compra_item.precio_unitario",
            "orden_compra_item.subtotal",
         ])
         .where("orden_compra_item.equipo_id", "=", id)
         .where("orden_compra.deleted_at", "is", null)
         .orderBy("orden_compra.fecha", "desc")
         .execute();

      return rows.map((r) => ({
         id: r.id,
         orden_compra_id: r.orden_compra_id,
         orden_fecha: new Date(r.orden_fecha),
         orden_estado: r.orden_estado,
         descripcion: r.descripcion,
         cantidad: Number(r.cantidad),
         precio_unitario: Number(r.precio_unitario),
         subtotal: Number(r.subtotal),
      }));
   }
}