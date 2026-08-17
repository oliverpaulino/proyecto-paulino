import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   CreatePagoDTO,
   DeletePagoDTO,
   InfoDestinoPago,
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

    private buildCodigoOrdenCompra(referencia: number, fecha: Date): string {
      const yy = String(fecha.getFullYear()).slice(-2);
      const mm = String(fecha.getMonth() + 1).padStart(2, "0");
      const dd = String(fecha.getDate()).padStart(2, "0");
      const ref = String(referencia).padStart(3, "0");
      return `OC-${yy}${mm}${dd}-${ref}`;
    }

   private mapToEntity(row: any): Pago {
      return Pago.create({
         ...row,
         codigoReferencia: this.buildCodigoReferencia("PAG", row.referencia),
         gasto_codigo_referencia: row.gasto_referencia ? this.buildCodigoReferencia("GAS", row.gasto_referencia) : null,
         deduccion_codigo_referencia: row.deduccion_referencia ? this.buildCodigoReferencia("DED", row.deduccion_referencia) : null,
         // `conduce` no tiene `referencia` numérica: el folio físico es el código.
         conduce_numero_referencia: row.conduce_numero_referencia ?? null,
         proyecto_codigo_referencia: row.proyecto_referencia ? this.buildCodigoReferencia("PRO", row.proyecto_referencia) : null,
         orden_compra_codigo_referencia: row.orden_compra_referencia ? this.buildCodigoOrdenCompra(row.orden_compra_referencia, new Date(row.orden_compra_fecha)) : null,
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
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .leftJoin("conduce", "conduce.id", "pago.conduce_id")
         .leftJoin("proyecto", "proyecto.id", "pago.proyecto_id")
         .leftJoin("orden_compra", "orden_compra.id", "pago.orden_compra_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "deduccion.referencia as deduccion_referencia",
            "conduce.numero_referencia as conduce_numero_referencia",
            "proyecto.referencia as proyecto_referencia",
            "orden_compra.referencia as orden_compra_referencia",
            "orden_compra.fecha as orden_compra_fecha",
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
      if (params?.deduccion_empleado_id) query = query.where("pago.deduccion_empleado_id", "=", params.deduccion_empleado_id);
      if (params?.conduce_id) query = query.where("pago.conduce_id", "=", params.conduce_id);
      if (params?.proyecto_id) query = query.where("pago.proyecto_id", "=", params.proyecto_id);
      if (params?.orden_compra_id) query = query.where("pago.orden_compra_id", "=", params.orden_compra_id);
      if (params?.proveedor_id) {
         const proveedorId = String(params.proveedor_id);
         query = query.where((eb) =>
            eb.or([
               eb("gasto.proveedor_id", "=", proveedorId),
               eb("orden_compra.proveedor_id", "=", proveedorId),
            ]),
         );
      }

      // Un pago "pertenece" a un equipo si se hizo contra un gasto del equipo,
      // una deducción del equipo o una orden de compra que incluye al equipo.
      if (params?.equipo_id) {
         const equipoId = params.equipo_id;
         query = query.where((eb) =>
            eb.or([
               eb.exists(
                  this.db
                     .selectFrom("gasto")
                     .select("gasto.id")
                     .where(sql.ref("gasto.id"), "=", sql.ref("pago.gasto_empresa_id"))
                     .where("gasto.equipo_id", "=", equipoId)
               ),
               eb.exists(
                  this.db
                     .selectFrom("deduccion")
                     .select("deduccion.id")
                     .where(sql.ref("deduccion.id"), "=", sql.ref("pago.deduccion_empleado_id"))
                     .where("deduccion.equipo_id", "=", equipoId)
               ),
               eb.exists(
                  this.db
                     .selectFrom("orden_compra_item")
                     .select("orden_compra_item.id")
                     .where(sql.ref("orden_compra_item.orden_compra_id"), "=", sql.ref("pago.orden_compra_id"))
                     .where("orden_compra_item.equipo_id", "=", equipoId)
               ),
            ])
         );
      }

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
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .leftJoin("conduce", "conduce.id", "pago.conduce_id")
         .leftJoin("proyecto", "proyecto.id", "pago.proyecto_id")
         .leftJoin("orden_compra", "orden_compra.id", "pago.orden_compra_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "deduccion.referencia as deduccion_referencia",
            "conduce.numero_referencia as conduce_numero_referencia",
            "proyecto.referencia as proyecto_referencia",
            "orden_compra.referencia as orden_compra_referencia",
            "orden_compra.fecha as orden_compra_fecha",
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
         .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
         .leftJoin("conduce", "conduce.id", "pago.conduce_id")
         .leftJoin("proyecto", "proyecto.id", "pago.proyecto_id")
         .leftJoin("orden_compra", "orden_compra.id", "pago.orden_compra_id")
         .selectAll("pago")
         .select([
            "gasto.referencia as gasto_referencia",
            "deduccion.referencia as deduccion_referencia",
            "conduce.numero_referencia as conduce_numero_referencia",
            "proyecto.referencia as proyecto_referencia",
            "orden_compra.referencia as orden_compra_referencia",
            "orden_compra.fecha as orden_compra_fecha",
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
            deduccion_empleado_id: data.deduccion_empleado_id ?? null,
            conduce_id: data.conduce_id ?? null,
            proyecto_id: data.proyecto_id ?? null,
            orden_compra_id: data.orden_compra_id ?? null,
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

   /**
    * Función polimórfica: según cuál id de destino llegue, calcula el balance
    * con la fórmula correspondiente. Solo suma pagos no anulados.
    * Si `fecha` se pasa, solo suma pagos con created_at < fecha.
    */
   private async sumPagosPorDestino(
      columna: "gasto_empresa_id" | "deduccion_empleado_id" | "conduce_id" | "proyecto_id" | "orden_compra_id",
      id: string,
      tipo: "ENTRADA" | "SALIDA",
      fecha?: string
   ): Promise<number> {
      let query = this.db
         .selectFrom("pago")
         .select(({ fn }) => fn.sum("pago.monto_pagado").as("total"))
         .where(sql.ref(`pago.${columna}`), "=", id)
         .where("pago.tipo_movimiento", "=", tipo)
         .where("pago.deleted_at", "is", null);

      if (fecha) {
         query = query.where("pago.created_at", "<", new Date(fecha));
      }

      const row = await query.executeTakeFirst();
      return Number(row?.total ?? 0);
   }

   async getInfoDestino(params: {
      gasto_empresa_id?: string | null;
      deduccion_empleado_id?: string | null;
      conduce_id?: string | null;
      proyecto_id?: string | null;
      orden_compra_id?: string | null;
      fecha?: string;
   }): Promise<InfoDestinoPago | null> {
      const { gasto_empresa_id, deduccion_empleado_id, conduce_id, proyecto_id, orden_compra_id, fecha } = params;

      const base = {
         estado: null,
         ordenCompraReferencia: null,
         capital: 0,
         cobrableProyecto: false,
         cobrableCliente: 0,
         cobrableEmpresa: 0,
         pagadoCliente: 0,
         pagadoEmpresa: 0,
         totalPagado: 0,
         totalAbonado: 0,
         totalUtilizado: 0,
         montoPagado: 0,
      };

      if (gasto_empresa_id) {
         const gasto = await this.db
            .selectFrom("gasto")
            .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
            .select([
               "gasto.id",
               "gasto.referencia",
               "gasto.concepto",
               "gasto.monto_total",
               "gasto.cobrable_proyecto",
               "gasto.cobrable_monto",
               "gasto.orden_compra_id",
               "orden_compra.referencia as orden_compra_referencia",
               "orden_compra.fecha as orden_compra_fecha",
            ])
            .where("gasto.id", "=", gasto_empresa_id)
            .where("gasto.deleted_at", "is", null)
            .executeTakeFirst();

         if (!gasto) return null;

         const pagadoEmpresa = await this.sumPagosPorDestino("gasto_empresa_id", gasto_empresa_id, "SALIDA", fecha);
         const pagadoCliente = await this.sumPagosPorDestino("gasto_empresa_id", gasto_empresa_id, "ENTRADA", fecha);
         const montoTotal = Number(gasto.monto_total);
         const cobrableProyecto = !!gasto.cobrable_proyecto;
         const cobrableCliente = gasto.cobrable_monto != null ? Number(gasto.cobrable_monto) : 0;
         const cobrableEmpresa = Math.max(0, montoTotal - cobrableCliente);

         return {
            ...base,
            tipo: "GASTO",
            referencia: this.buildCodigoReferencia("GAS", gasto.referencia),
            concepto: gasto.concepto,
            ordenCompraReferencia:
               gasto.orden_compra_referencia != null && gasto.orden_compra_fecha
                  ? this.buildCodigoOrdenCompra(gasto.orden_compra_referencia, new Date(gasto.orden_compra_fecha))
                  : null,
            montoTotal,
            cobrableProyecto,
            cobrableCliente,
            cobrableEmpresa,
            pagadoCliente,
            pagadoEmpresa,
            // Un gasto nacido de una orden de compra se paga contra la OC,
            // nunca contra el gasto: no acepta pagos de salida.
            aceptaPagoSalida: gasto.orden_compra_id ? 0 : Math.max(0, montoTotal - pagadoEmpresa),
            aceptaPagoEntrada: cobrableProyecto ? Math.max(0, cobrableCliente - pagadoCliente) : 0,
         };
      }

      if (deduccion_empleado_id) {
         const deduccion = await this.db
            .selectFrom("deduccion")
            .select(["id", "referencia", "concepto", "monto_total"])
            .where("id", "=", deduccion_empleado_id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

         if (!deduccion) return null;

         const totalPagado = await this.sumPagosPorDestino("deduccion_empleado_id", deduccion_empleado_id, "ENTRADA", fecha);
         const montoTotal = Number(deduccion.monto_total);

         return {
            ...base,
            tipo: "DEDUCCION",
            referencia: this.buildCodigoReferencia("DED", deduccion.referencia),
            concepto: deduccion.concepto,
            montoTotal,
            pagadoCliente: totalPagado,
            totalPagado,
            aceptaPagoEntrada: Math.max(0, montoTotal - totalPagado),
            aceptaPagoSalida: 0,
         };
      }

      if (proyecto_id) {
         const proyecto = await this.db
            .selectFrom("proyecto")
            .select(["id", "referencia", "nombre", "estado"])
            .where("id", "=", proyecto_id)
            .executeTakeFirst();

         if (!proyecto) return null;

         const entradas = await this.sumPagosPorDestino("proyecto_id", proyecto_id, "ENTRADA", fecha);
         const salidas = await this.sumPagosPorDestino("proyecto_id", proyecto_id, "SALIDA", fecha);
         const capital = entradas - salidas;

         return {
            ...base,
            tipo: "PROYECTO",
            referencia: this.buildCodigoReferencia("PRO", proyecto.referencia),
            concepto: proyecto.nombre,
            estado: proyecto.estado,
            montoTotal: capital,
            capital,
            pagadoCliente: entradas,
            pagadoEmpresa: salidas,
            totalAbonado: entradas,
            totalUtilizado: salidas,
            // Las entradas aumentan el capital: siempre se aceptan.
            aceptaPagoEntrada: null,
            aceptaPagoSalida: Math.max(0, capital),
         };
      }

      if (orden_compra_id) {
         const oc = await this.db
            .selectFrom("orden_compra")
            .select(["id", "referencia", "fecha", "total", "estado", "notas"])
            .where("id", "=", orden_compra_id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

         if (!oc) return null;

         const pagado = await this.sumPagosPorDestino("orden_compra_id", orden_compra_id, "SALIDA", fecha);
         const total = Number(oc.total);

         return {
            ...base,
            tipo: "ORDEN_COMPRA",
            referencia: this.buildCodigoOrdenCompra(oc.referencia, new Date(oc.fecha)),
            concepto: oc.notas,
            estado: oc.estado,
            montoTotal: total,
            pagadoEmpresa: pagado,
            montoPagado: pagado,
            aceptaPagoEntrada: 0,
            aceptaPagoSalida: Math.max(0, total - pagado),
         };
      }

      if (conduce_id) {
         const conduce = await this.db
            .selectFrom("conduce")
            .select(["id", "numero_referencia", "subtotal", "cliente_id", "es_cobrable"])
            .where("id", "=", conduce_id)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

         if (!conduce) return null;

         const pagado = await this.sumPagosPorDestino("conduce_id", conduce_id, "ENTRADA", fecha);
         const montoTotal = Number(conduce.subtotal);

         return {
            ...base,
            tipo: "CONDUCE",
            referencia: conduce.numero_referencia,
            concepto: `Conduce ${conduce.numero_referencia}`,
            montoTotal,
            pagadoCliente: pagado,
            aceptaPagoEntrada: Math.max(0, montoTotal - pagado),
            aceptaPagoSalida: 0,
         };
      }

      return null;
   }
}