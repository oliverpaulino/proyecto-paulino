import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreatePagoDTO,
   DeletePagoDTO,
   Pago,
   IPagoRepository,
   UpdatePagoDTO,
} from "../domain/pagos.domain";

export class KyselyPagoRepository implements IPagoRepository {
   constructor(private readonly db: Kysely<DB>) { }

    private buildCodigoReferencia(prefix: string, referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `${prefix}-${ref}`;
    }

   private mapToEntity(row: any): Pago {
      return Pago.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia("PAG", row.referencia),
         gasto_codigo_referencia: row.gasto_referencia ? this.buildCodigoReferencia("GAS", row.gasto_referencia) : null,
         costo_codigo_referencia: row.costo_referencia ? this.buildCodigoReferencia("COS", row.costo_referencia) : null,
         deduccion_codigo_referencia: row.deduccion_referencia ? this.buildCodigoReferencia("DED", row.deduccion_referencia) : null,
         monto_pagado: Number(row.monto_pagado),
         fecha: new Date(row.fecha),
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
         deleted_at: row.deleted_at ? new Date(row.deleted_at) : null,
      });
   }

   private safeParseReferencia(search: string): number | null {
      if (!search) return null;
      const text = search.trim().toUpperCase();
      if (text.startsWith("PAG-")) {
         const numero = Number(text.slice(4));
         return Number.isNaN(numero) ? null : numero;
      }
      const numeroDirecto = Number(text);
      return Number.isNaN(numeroDirecto) ? null : numeroDirecto;
   }

   private buildBaseQuery(isDeleted: boolean, params?: any) {
      let query = this.db
         .selectFrom("pago")
         .leftJoin("gasto", "gasto.id", "pago.gasto_empresa_id")
         .leftJoin("costo", "costo.id", "pago.costo_cliente_id")
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "costo.referencia as costo_referencia",
            "deduccion.referencia as deduccion_referencia",
         ]);

      if (isDeleted) {
         query = query.where("pago.deleted_at", "is not", null);
      } else {
         query = query.where("pago.deleted_at", "is", null);
      }

      if (params?.search) {
         const searchString = String(params.search).trim();
         const searchLike = `%${searchString}%`;
         const refNumber = this.safeParseReferencia(searchString);

         query = query.where((eb) => {
            const conditions: any[] = [
               eb("pago.concepto", "ilike", searchLike),
               eb("pago.metodo_pago", "ilike", searchLike),
               eb("pago.tipo_movimiento", "ilike", searchLike),
            ];

            if (refNumber !== null) {
               conditions.push(eb("pago.referencia", "=", refNumber));
            }

            return eb.or(conditions);
         });
      }

      if (params?.start) query = query.where("pago.fecha", ">=", params.start);
      if (params?.end) query = query.where("pago.fecha", "<=", params.end);
      if (params?.gasto_empresa_id) query = query.where("pago.gasto_empresa_id", "=", params.gasto_empresa_id);
      if (params?.costo_cliente_id) query = query.where("pago.costo_cliente_id", "=", params.costo_cliente_id);
      if (params?.deduccion_empleado_id) query = query.where("pago.deduccion_empleado_id", "=", params.deduccion_empleado_id);

      return query;
   }

   async findAll(params?: any): Promise<Pago[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(false, params)
         .orderBy("pago.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findAllDeleted(params?: any): Promise<Pago[]> {
      const { page = 1, limit = 20 } = params || {};
      const rows = await this.buildBaseQuery(true, params)
         .orderBy("pago.deleted_at", "desc")
         .orderBy("pago.fecha", "desc")
         .offset((page - 1) * limit)
         .limit(limit)
         .execute();

      return rows.map((row) => this.mapToEntity(row));
   }

   async findById(id: string): Promise<Pago | null> {
      const row = await this.db
         .selectFrom("pago")
         .leftJoin("gasto", "gasto.id", "pago.gasto_empresa_id")
         .leftJoin("costo", "costo.id", "pago.costo_cliente_id")
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "costo.referencia as costo_referencia",
            "deduccion.referencia as deduccion_referencia",
         ])
         .where("pago.id", "=", id)
         .where("pago.deleted_at", "is", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async findDeletedById(id: string): Promise<Pago | null> {
      const row = await this.db
         .selectFrom("pago")
         .leftJoin("gasto", "gasto.id", "pago.gasto_empresa_id")
         .leftJoin("costo", "costo.id", "pago.costo_cliente_id")
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "costo.referencia as costo_referencia",
            "deduccion.referencia as deduccion_referencia",
         ])
         .where("pago.id", "=", id)
         .where("pago.deleted_at", "is not", null)
         .executeTakeFirst();

      if (!row) return null;
      return this.mapToEntity(row);
   }

   async create(data: CreatePagoDTO): Promise<Pago> {
      const row = await this.db
         .insertInto("pago")
         .values({
            metodo_pago: data.metodo_pago,
            monto_pagado: data.monto_pagado,
            concepto: data.concepto,
            tipo_movimiento: data.tipo_movimiento,
            fecha: data.fecha ?? new Date(),
            gasto_empresa_id: data.gasto_empresa_id ?? null,
            costo_cliente_id: data.costo_cliente_id ?? null,
            deduccion_empleado_id: data.deduccion_empleado_id ?? null,
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.findById(row.id) as Promise<Pago>;
   }

   async update(id: string, data: UpdatePagoDTO): Promise<Pago | null> {
      await this.db
         .updateTable("pago")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .where("deleted_at", "is", null)
         .executeTakeFirst();

      return this.findById(id);
   }

   async delete(id: string, data: DeletePagoDTO): Promise<boolean> {
      const result = await this.db
         .updateTable("pago")
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

   async restore(id: string): Promise<Pago | null> {
      const result = await this.db
         .updateTable("pago")
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