import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateGastoDTO,
   DeleteGastoDTO,
   Gasto,
   IGastoRepository,
   UpdateGastoDTO,
} from "../domain/gastos.domain";

export class KyselyGastoRepository implements IGastoRepository {
   constructor(private readonly db: Kysely<DB>) { }

    private buildCodigoReferencia(prefix: string, referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `${prefix}-${ref}`;
    }

   private mapToEntity(row: any): Gasto {
      return Gasto.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia("GAS", row.referencia),
         orden_compra_codigo_referencia: row.orden_compra_codigo_referencia 
            ? this.buildCodigoReferencia("OC", row.orden_compra_codigo_referencia) 
            : null,
         proyecto_codigo_referencia: row.proyecto_codigo_referencia || null,
         equipo_codigo_referencia: row.equipo_codigo_referencia 
            ? this.buildCodigoReferencia("EQU", row.equipo_codigo_referencia) 
            : null,
         monto_total: Number(row.monto_total),
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
      });
   }

   private safeParseReferencia(search: string): number | null {
      if (!search) return null;
      
      const text = search.trim().toUpperCase();
      
      if (text.startsWith("GAS-")) {
         const numero = Number(text.slice(4));
         return Number.isNaN(numero) ? null : numero;
      }
      
      const numeroDirecto = Number(text);
      return Number.isNaN(numeroDirecto) ? null : numeroDirecto;
   }

   private buildBaseQuery(isDeleted: boolean, params?: any) {
      let query = this.db
         .selectFrom("gasto")
         .innerJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
         .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
         .leftJoin("proyecto", "proyecto.id", "gasto.proyecto_id")
         .leftJoin("equipo", "equipo.id", "gasto.equipo_id")
         .selectAll("gasto")
         .select([
            "categoria_gasto.nombre as categoria_gasto_nombre",
            "categoria_gasto.grupo as categoria_gasto_grupo",
            "orden_compra.referencia as orden_compra_codigo_referencia",
            "proyecto.id as proyecto_codigo_referencia",
            "equipo.referencia as equipo_codigo_referencia",
         ]);

      if (isDeleted) {
         query = query.where("gasto.deleted_at", "is not", null);
      } else {
         query = query.where("gasto.deleted_at", "is", null);
      }

      if (params?.search) {
         const searchString = String(params.search).trim();
         const searchLike = `%${searchString}%`;
         const refNumber = this.safeParseReferencia(searchString);

         query = query.where((eb) => {
            const conditions: any[] = [
               eb("gasto.concepto", "ilike", searchLike),
               eb("gasto.ncf", "ilike", searchLike),
            ];

            if (refNumber !== null) {
               conditions.push(eb("gasto.referencia", "=", refNumber));
            }

            return eb.or(conditions);
         });
      }

      if (params?.start) query = query.where("gasto.fecha", ">=", params.start);
      if (params?.end) query = query.where("gasto.fecha", "<=", params.end);
      if (params?.categoria) query = query.where("gasto.categoria_gasto_id", "=", params.categoria);
      if (params?.grupo) query = query.where("categoria_gasto.grupo", "=", params.grupo);
      if (params?.orden_compra_id) query = query.where("gasto.orden_compra_id", "=", params.orden_compra_id);
      if (params?.proyecto_id) query = query.where("gasto.proyecto_id", "=", params.proyecto_id);
      if (params?.equipo_id) query = query.where("gasto.equipo_id", "=", params.equipo_id);

      return query;
   }

   async findAll(params?: any): Promise<Gasto[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(false, params)
         .orderBy("gasto.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAllDeleted(params?: any): Promise<Gasto[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(true, params)
         .orderBy("gasto.deleted_at", "desc")
         .orderBy("gasto.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Gasto | null> {
      const row = await this.db
         .selectFrom("gasto")
         .innerJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
         .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
         .leftJoin("proyecto", "proyecto.id", "gasto.proyecto_id")
         .leftJoin("equipo", "equipo.id", "gasto.equipo_id")
         .selectAll("gasto")
         .select([
            "categoria_gasto.nombre as categoria_gasto_nombre",
            "categoria_gasto.grupo as categoria_gasto_grupo",
            "orden_compra.referencia as orden_compra_codigo_referencia",
            "proyecto.id as proyecto_codigo_referencia",
            "equipo.referencia as equipo_codigo_referencia",
         ])
         .where("gasto.id", "=", id)
         .where("gasto.deleted_at", "is", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async findDeletedById(id: string): Promise<Gasto | null> {
      const row = await this.db
         .selectFrom("gasto")
         .innerJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
         .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
         .leftJoin("proyecto", "proyecto.id", "gasto.proyecto_id")
         .leftJoin("equipo", "equipo.id", "gasto.equipo_id")
         .selectAll("gasto")
         .select([
            "categoria_gasto.nombre as categoria_gasto_nombre",
            "categoria_gasto.grupo as categoria_gasto_grupo",
            "orden_compra.referencia as orden_compra_codigo_referencia",
            "proyecto.id as proyecto_codigo_referencia",
            "equipo.referencia as equipo_codigo_referencia",
         ])
         .where("gasto.id", "=", id)
         .where("gasto.deleted_at", "is not", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreateGastoDTO): Promise<Gasto> {
      const row = await this.db
         .insertInto("gasto")
         .values({
            monto_total: data.monto_total,
            concepto: data.concepto,
            ncf: data.ncf,
            categoria_gasto_id: data.categoria_gasto_id,
            orden_compra_id: data.orden_compra_id ?? null,
            proyecto_id: data.proyecto_id ?? null,
            equipo_id: data.equipo_id ?? null,
            fecha: data.fecha ?? new Date(),
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.findById(row.id) as Promise<Gasto>;
   }

   async update(id: string, data: UpdateGastoDTO): Promise<Gasto | null> {
      await this.db
         .updateTable("gasto")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return this.findById(id);
   }

   async delete(id: string, data: DeleteGastoDTO): Promise<boolean> {
      const result = await this.db
         .updateTable("gasto")
         .set({
            deleted_at: new Date(),
            deleted_by: data.deleted_by ?? null,
            deleted_reason: data.deleted_reason ?? null,
         })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
   }

   async restore(id: string): Promise<Gasto | null> {
      const result = await this.db
         .updateTable("gasto")
         .set({
            deleted_at: null,
            deleted_by: null,
            deleted_reason: null,
         })
         .where("id", "=", id)
         .where("deleted_at", "is not", null)
         .executeTakeFirst();

      return this.findById(id);
   }
}