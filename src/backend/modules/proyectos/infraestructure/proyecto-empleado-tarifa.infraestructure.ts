import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoEmpleadoTarifaRepository,
   UpsertProyectoEmpleadoTarifaDTO,
   ProyectoEmpleadoTarifaProps,
   OperadorTarifaRow,
   BulkUpsertInput,
} from "../domain/proyecto-empleado-tarifa.domain";

export class KyselyProyectoEmpleadoTarifaRepository implements IProyectoEmpleadoTarifaRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findByProyectoId(proyectoId: string): Promise<ProyectoEmpleadoTarifaProps[]> {
      const rows = await this.db
         .selectFrom("proyecto_empleado_tarifa as pet")
         .innerJoin("empleado as e", "e.id", "pet.empleado_id")
         .innerJoin("categoria_equipo_tarifa as cet", "cet.id", "pet.categoria_equipo_tarifa_id")
         .innerJoin("categoria_equipo as ce", "ce.id", "cet.categoria_equipo_id")
         .innerJoin("medida_cobro as mc", "mc.id", "cet.medida_cobro_id")
         .select([
            "pet.id",
            "pet.proyecto_id",
            "pet.empleado_id",
            "e.nombre as empleado_nombre",
            "pet.categoria_equipo_tarifa_id",
            "cet.nombre as categoria_equipo_tarifa_nombre",
            "ce.nombre as categoria_equipo_nombre",
            "mc.nombre as medida_cobro_nombre",
            "pet.monto_pago",
            "pet.created_at",
            "pet.updated_at",
         ])
         .where("pet.proyecto_id", "=", proyectoId)
         .execute();
      return rows.map((r) => this.#map(r));
   }

   async findOperadoresConTarifas(
      proyectoId: string,
      search?: string,
      page?: number,
      limit?: number
   ): Promise<{ rows: OperadorTarifaRow[]; total: number }> {
      const safePage = Math.max(1, page ?? 1);
      const safeLimit = Math.min(100, Math.max(1, limit ?? 20));
      const offset = (safePage - 1) * safeLimit;

      let baseQuery = this.db
         .selectFrom("empleado as e")
         .innerJoin("operador as op", "op.empleado_id", "e.id")
         .leftJoin("empleado_categoria_tarifa as ect", "ect.empleado_id", "e.id")
         .leftJoin("categoria_equipo_tarifa as cet", "cet.id", "ect.categoria_equipo_tarifa_id")
         .leftJoin("categoria_equipo as ce", "ce.id", "cet.categoria_equipo_id")
         .leftJoin("medida_cobro as mc", "mc.id", "cet.medida_cobro_id")
         .leftJoin("proyecto_empleado_tarifa as pet", (join) =>
            join
               .onRef("pet.empleado_id", "=", "e.id")
               .onRef("pet.categoria_equipo_tarifa_id", "=", "cet.id")
               .on("pet.proyecto_id", "=", proyectoId)
         )
         .where("e.activo", "=", true)
         .where((eb) => eb.or([
            eb("ect.id", "is not", null),
            eb("pet.id", "is not", null),
         ]));

      if (search && search.trim()) {
         const searchLike = `%${search.trim()}%`;
         baseQuery = baseQuery.where("e.nombre", "ilike", searchLike);
      }

      const countResult = await baseQuery
         .select(sql<number>`COUNT(*)`.as("total"))
         .executeTakeFirst();
      const total = Number(countResult?.total ?? 0);

      const rows = await baseQuery
         .select([
            "e.id as empleado_id",
            "e.nombre as empleado_nombre",
            "cet.id as categoria_equipo_tarifa_id",
            "cet.nombre as categoria_equipo_tarifa_nombre",
            "ce.nombre as categoria_equipo_nombre",
            "mc.nombre as medida_cobro_nombre",
            "ect.monto_pago as monto_pago_global",
            "pet.monto_pago as monto_pago_proyecto",
            "pet.id as proyecto_empleado_tarifa_id",
         ])
         .orderBy("e.nombre", "asc")
         .orderBy("ce.nombre", "asc")
         .orderBy("cet.nombre", "asc")
         .limit(safeLimit)
         .offset(offset)
         .execute();

      return {
         rows: rows.map((r) => ({
            empleado_id: r.empleado_id as string,
            empleado_nombre: r.empleado_nombre as string,
            categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id as string,
            categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre as string,
            categoria_equipo_nombre: r.categoria_equipo_nombre as string,
            medida_cobro_nombre: r.medida_cobro_nombre as string,
            monto_pago_global: r.monto_pago_global != null ? Number(r.monto_pago_global) : null,
            monto_pago_proyecto: r.monto_pago_proyecto != null ? Number(r.monto_pago_proyecto) : null,
            proyecto_empleado_tarifa_id: r.proyecto_empleado_tarifa_id as string | null,
         })),
         total,
      };
   }

   async upsert(data: UpsertProyectoEmpleadoTarifaDTO): Promise<ProyectoEmpleadoTarifaProps> {
      const existente = await this.db
         .selectFrom("proyecto_empleado_tarifa")
         .select(["id"])
         .where("proyecto_id", "=", data.proyecto_id)
         .where("empleado_id", "=", data.empleado_id)
         .where("categoria_equipo_tarifa_id", "=", data.categoria_equipo_tarifa_id)
         .executeTakeFirst();

      if (existente) {
         await this.db
            .updateTable("proyecto_empleado_tarifa")
            .set({ monto_pago: data.monto_pago, updated_at: new Date() })
            .where("id", "=", existente.id)
            .execute();
         return this.findByProyectoId(data.proyecto_id).then(rows => rows.find(r => r.id === existente.id)!);
      }

      const inserted = await this.db
         .insertInto("proyecto_empleado_tarifa")
         .values({
            proyecto_id: data.proyecto_id,
            empleado_id: data.empleado_id,
            categoria_equipo_tarifa_id: data.categoria_equipo_tarifa_id,
            monto_pago: data.monto_pago,
         })
         .returning(["id"])
         .executeTakeFirstOrThrow();

      return this.findByProyectoId(data.proyecto_id).then(rows => rows.find(r => r.id === inserted.id)!);
   }

   async bulkUpsert(proyectoId: string, tarifas: BulkUpsertInput[]): Promise<void> {
      if (tarifas.length === 0) return;

      const values = tarifas.map((t) => ({
         proyecto_id: proyectoId,
         empleado_id: t.empleado_id,
         categoria_equipo_tarifa_id: t.categoria_equipo_tarifa_id,
         monto_pago: t.monto_pago,
      }));

      await this.db
         .insertInto("proyecto_empleado_tarifa")
         .values(values)
         .onConflict((oc) => oc
            .columns(["proyecto_id", "empleado_id", "categoria_equipo_tarifa_id"])
            .doUpdateSet({
               monto_pago: (eb) => eb.ref("excluded.monto_pago"),
               updated_at: new Date(),
            })
         )
         .execute();
   }

   async findById(id: string): Promise<ProyectoEmpleadoTarifaProps | null> {
      const row = await this.db
         .selectFrom("proyecto_empleado_tarifa")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();
      return row ? this.#map(row) : null;
   }

   async delete(id: string): Promise<void> {
      await this.db.deleteFrom("proyecto_empleado_tarifa").where("id", "=", id).execute();
   }

   #map(r: Record<string, unknown>): ProyectoEmpleadoTarifaProps {
      return {
         id: r.id as string,
         proyecto_id: r.proyecto_id as string,
         empleado_id: r.empleado_id as string,
         empleado_nombre: r.empleado_nombre as string,
         categoria_equipo_tarifa_id: r.categoria_equipo_tarifa_id as string,
         categoria_equipo_tarifa_nombre: r.categoria_equipo_tarifa_nombre as string,
         categoria_equipo_nombre: r.categoria_equipo_nombre as string,
         medida_cobro_nombre: r.medida_cobro_nombre as string,
         monto_pago: Number(r.monto_pago),
         created_at: new Date(r.created_at as string),
         updated_at: new Date(r.updated_at as string),
      };
   }
}
