import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateDeduccionDTO,
   DeleteDeduccionDTO,
   Deduccion,
   IDeduccionRepository,
   PagarDeduccionDTO,
   UpdateDeduccionDTO,
} from "../domain/deducciones.domain";

export class KyselyDeduccionRepository implements IDeduccionRepository {
   constructor(private readonly db: Kysely<DB>) { }

    private buildCodigoReferencia(prefix: string, referencia: number): string {
      const ref = String(referencia).padStart(3, "0");
      return `${prefix}-${ref}`;
    }

    /**
     * Subconsultas del avance de cobro de una deducción: cuánto y cuántas
     * cuotas han cobrado las nóminas (`deduccion_cuota`) y cuánto se ha pagado
     * a mano contra la deducción (`pago`). Con eso la entidad deriva
     * `cuotas_aplicadas`, `monto_cobrado` y `monto_pendiente`.
     */
    private cuotaSelects() {
      return [
         sql<string>`coalesce((
            select sum(dc.monto) from deduccion_cuota dc
            where dc.deduccion_id = deduccion.id
         ), 0)`.as("monto_cobrado_cuotas"),
         sql<string>`(
            select count(*) from deduccion_cuota dc
            where dc.deduccion_id = deduccion.id
         )`.as("cuotas_aplicadas"),
         sql<string>`coalesce((
            select sum(p.monto_pagado) from pago p
            where p.deduccion_empleado_id = deduccion.id
              and p.deleted_at is null
         ), 0)`.as("monto_cobrado_pagos"),
      ];
    }

   private mapToEntity(row: any): Deduccion {
      const montoCobradoCuotas = Number(row.monto_cobrado_cuotas ?? 0);
      const montoCobradoPagos = Number(row.monto_cobrado_pagos ?? 0);
      const montoCobrado = montoCobradoCuotas + montoCobradoPagos;
      return Deduccion.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia("DED", row.referencia),
         empleado_nombre: row.empleado_nombre || null,
         empleado_codigo_referencia: row.empleado_referencia
            ? this.buildCodigoReferencia("EMP", row.empleado_referencia) 
            : null,
         equipo_codigo_referencia: row.equipo_referencia 
            ? this.buildCodigoReferencia("EQU", row.equipo_referencia) 
            : null,
         gasto_codigo_referencia: row.gasto_referencia
            ? this.buildCodigoReferencia("GAS", row.gasto_referencia) 
            : null,
         monto_total: Number(row.monto_total),
         monto_cuota: Number(row.monto_cuota),
         balance_pendiente: row.balance_pendiente != null ? Number(row.balance_pendiente) : null,
         cuotas_sugeridas: Number(row.cuotas_sugeridas),
         cuotas_aplicadas: Number(row.cuotas_aplicadas ?? 0),
         monto_cobrado: montoCobrado,
         monto_pendiente: Math.max(0, Number(row.monto_total) - montoCobrado),
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
            ...this.cuotaSelects(),
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
            ...this.cuotaSelects(),
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
            ...this.cuotaSelects(),
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

   /**
    * Cobrado total de una deducción viva: nóminas (`deduccion_cuota`) + pagos
    * directos (`pago`). Devuelve `null` si la deducción no existe o está
    * anulada. Es la base para validar cuánto se puede pagar todavía.
    */
   private async getCobradoDeDeduccion(id: string) {
      const row = await this.db
         .selectFrom("deduccion as d")
         .select([
            "d.id",
            "d.monto_total",
            sql<string>`coalesce((
               select sum(dc.monto) from deduccion_cuota dc
               where dc.deduccion_id = d.id
            ), 0)`.as("cuotas"),
            sql<string>`coalesce((
               select sum(p.monto_pagado) from pago p
               where p.deduccion_empleado_id = d.id
                 and p.deleted_at is null
            ), 0)`.as("pagos"),
         ])
         .where("d.id", "=", id)
         .where("d.deleted_at", "is", null)
         .executeTakeFirst();

      if (!row) return null;
      const montoTotal = Number(row.monto_total);
      const cuotas = Number(row.cuotas ?? 0);
      const pagos = Number(row.pagos ?? 0);
      return {
         montoTotal,
         cuotas,
         pagos,
         pendiente: Math.max(0, montoTotal - cuotas - pagos),
      };
   }

   async pagar(id: string, data: PagarDeduccionDTO): Promise<Deduccion | null> {
      const cobrado = await this.getCobradoDeDeduccion(id);
      if (!cobrado) return null;

      if (!Number.isFinite(data.monto) || data.monto <= 0) {
         throw new Error("El monto del pago debe ser mayor a 0");
      }
      if (data.monto > cobrado.pendiente + 0.01) {
         throw new Error(
            `El monto del pago excede lo que queda por pagar de la deducción (` +
            `${cobrado.pendiente.toLocaleString("es-DO")})`
         );
      }

      // El pago queda como movimiento de salida vinculado a la deducción:
      // sale dinero de la empresa que la deducción le cobra al empleado.
      await this.db
         .insertInto("pago")
         .values({
            metodo_pago: data.metodo_pago ?? "EFECTIVO",
            monto_pagado: data.monto,
            concepto: data.concepto?.trim() || "Pago de deducción",
            tipo_movimiento: "SALIDA",
            fecha: data.fecha ?? new Date(),
            deduccion_empleado_id: id,
            created_at: new Date(),
            updated_at: new Date(),
         })
         .execute();

      const nuevoBalance = Math.max(
         0,
         cobrado.montoTotal - cobrado.cuotas - cobrado.pagos - data.monto
      );
      await this.db
         .updateTable("deduccion")
         .set({ balance_pendiente: nuevoBalance, updated_at: new Date() })
         .where("id", "=", id)
         .execute();

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