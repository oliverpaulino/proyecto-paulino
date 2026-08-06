import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateDeduccionDTO,
   DeleteDeduccionDTO,
   Deduccion,
   IDeduccionRepository,
   UpdateDeduccionDTO,
} from "../domain/deducciones.domain";

export class KyselyDeduccionRepository implements IDeduccionRepository {
   constructor(private readonly db: Kysely<DB>) { }

    private buildCodigoReferencia(prefix: string, referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `${prefix}-${ref}`;
    }

   private mapToEntity(row: any): Deduccion {
      return Deduccion.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia("DED", row.referencia),
         empleado_nombre: row.empleado_nombre || null,
         empleado_codigo_referenciar: row.empleado_referencia
            ? this.buildCodigoReferencia("EMP", row.empleado_referencia) 
            : null,
         equipo_codigo_referencia: row.equipo_referencia 
            ? this.buildCodigoReferencia("EQU", row.equipo_referencia) 
            : null,
         gasto_codigo_referencia: row.gasto_referencia
            ? this.buildCodigoReferencia("GAS", row.gasto_referencia) 
            : null,
         monto_total: Number(row.monto_total),
         balance_pendiente: row.balance_pendiente != null ? Number(row.balance_pendiente) : null,
         cuotas_sugeridas: Number(row.cuotas_sugeridas),
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
      });
   }

   private safeParseReferencia(search: string): number | null {
      if (!search) return null;
      const text = search.trim().toUpperCase();
      if (text.startsWith("DED-")) {
         const numero = Number(text.slice(4));
         return Number.isNaN(numero) ? null : numero;
      }
      const numeroDirecto = Number(text);
      return Number.isNaN(numeroDirecto) ? null : numeroDirecto;
   }

   private buildBaseQuery(isDeleted: boolean, params?: any) {
      let query = this.db
         .selectFrom("deduccion")
         .innerJoin("empleado", "empleado.id", "deduccion.empleado_id")
         .leftJoin("equipo", "equipo.id", "deduccion.equipo_id")
         .leftJoin("gasto", "gasto.id", "deduccion.gasto_id")
         .selectAll("deduccion")
         .select([
            "empleado.nombre as empleado_nombre",
            "empleado.referencia as empleado_referencia",
            "equipo.referencia as equipo_referencia",
            "gasto.referencia as gasto_referencia",
         ]);

      if (isDeleted) {
         query = query.where("deduccion.deleted_at", "is not", null);
      } else {
         query = query.where("deduccion.deleted_at", "is", null);
      }

      if (params?.search) {
         const searchString = String(params.search).trim();
         const searchLike = `%${searchString}%`;
         const refNumber = this.safeParseReferencia(searchString);

         query = query.where((eb) => {
            const conditions: any[] = [
               eb("deduccion.concepto", "ilike", searchLike),
               eb("empleado.nombre", "ilike", searchLike),
            ];

            if (refNumber !== null) {
               conditions.push(eb("deduccion.referencia", "=", refNumber));
            }

            return eb.or(conditions);
         });
      }

      if (params?.start) query = query.where("deduccion.fecha", ">=", params.start);
      if (params?.end) query = query.where("deduccion.fecha", "<=", params.end);
      if (params?.empleado_id) query = query.where("deduccion.empleado_id", "=", params.empleado_id);
      if (params?.equipo_id) query = query.where("deduccion.equipo_id", "=", params.equipo_id);

      return query;
   }

   async findAll(params?: any): Promise<Deduccion[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(false, params)
         .orderBy("deduccion.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAllDeleted(params?: any): Promise<Deduccion[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(true, params)
         .orderBy("deduccion.deleted_at", "desc")
         .orderBy("deduccion.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Deduccion | null> {
      const row = await this.db
         .selectFrom("deduccion")
         .innerJoin("empleado", "empleado.id", "deduccion.empleado_id")
         .leftJoin("equipo", "equipo.id", "deduccion.equipo_id")
         .leftJoin("gasto", "gasto.id", "deduccion.gasto_id")
         .selectAll("deduccion")
         .select([
            "empleado.nombre as empleado_nombre",
            "empleado.referencia as empleado_referencia",
            "equipo.referencia as equipo_referencia",
            "gasto.referencia as gasto_referencia",
         ])
         .where("deduccion.id", "=", id)
         .where("deduccion.deleted_at", "is", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async findDeletedById(id: string): Promise<Deduccion | null> {
      const row = await this.db
         .selectFrom("deduccion")
         .innerJoin("empleado", "empleado.id", "deduccion.empleado_id")
         .leftJoin("equipo", "equipo.id", "deduccion.equipo_id")
         .selectAll("deduccion")
         .select([
            "empleado.nombre as empleado_nombre",
            "equipo.referencia as equipo_referencia",
         ])
         .where("deduccion.id", "=", id)
         .where("deduccion.deleted_at", "is not", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreateDeduccionDTO): Promise<Deduccion> {
      const row = await this.db
         .insertInto("deduccion")
         .values({
            empleado_id: data.empleado_id,
            equipo_id: data.equipo_id ?? null,
            gasto_id: data.gasto_id ?? null,
            monto_total: data.monto_total,
            balance_pendiente: data.balance_pendiente ?? null,
            cuotas_sugeridas: data.cuotas_sugeridas ?? 1,
            monto_cuota: data.monto_cuota ?? data.monto_total / (data.cuotas_sugeridas ?? 1),
            concepto: data.concepto,
            fecha: data.fecha ?? new Date(),
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.findById(row.id) as Promise<Deduccion>;
   }

   async update(id: string, data: UpdateDeduccionDTO): Promise<Deduccion | null> {
      await this.db
         .updateTable("deduccion")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return this.findById(id);
   }

   async delete(id: string, data: DeleteDeduccionDTO): Promise<boolean> {
      const result = await this.db
         .updateTable("deduccion")
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

   async restore(id: string): Promise<Deduccion | null> {
      const result = await this.db
         .updateTable("deduccion")
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