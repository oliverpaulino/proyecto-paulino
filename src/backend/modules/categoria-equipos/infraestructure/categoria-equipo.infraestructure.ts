import { Kysely, sql } from "kysely";
import { DB } from "@/backend/database";
import {
   CategoriaEquipo,
   CategoriaEquipoProps,
   CreateCategoriaEquipoDTO,
   ICategoriaEquipoRepository,
   UpdateCategoriaEquipoDTO,
} from "../domain/categoria-equipo.domain";

export class KyselyCategoriaEquipoRepository implements ICategoriaEquipoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findById(id: string): Promise<CategoriaEquipo | null> {
      const row = await this.db
         .selectFrom("categoria_equipo as ce")
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
         .where("ce.id", "=", id)
         .groupBy(["ce.id"])
         .executeTakeFirst();

      if (!row) return null;

      return CategoriaEquipo.create({
         id: row.id,
         nombre: row.nombre,
         tarifas: row.tarifas,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(): Promise<CategoriaEquipo[]> {
      // Usamos json_agg (función de PostgreSQL) para traer las tarifas en la misma consulta
      const rows = await this.db
         .selectFrom("categoria_equipo as ce")
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
                     'medida_cobro_id', cet.medida_cobro_id,
                     'precio_unitario', cet.precio_unitario,
                     'cobra_minimo', cet.cobra_minimo
                  )`
               ]).filterWhere("cet.id", "is not", null),
               sql`'[]'::json`
            ).as("tarifas")
         ])
         .groupBy(["ce.id"])
         .orderBy("ce.nombre", "asc")
         .execute();

      return rows.map((row: any) => CategoriaEquipo.create({
         id: row.id,
         nombre: row.nombre,
         tarifas: row.tarifas,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      }));
   }

   async create(data: CreateCategoriaEquipoDTO): Promise<CategoriaEquipo> {
      try {
         return await this.db.transaction().execute(async (trx) => {
            // 1. Insertar la categoría base
            const cat = await trx
               .insertInto("categoria_equipo")
               .values({
                  nombre: data.nombre,
                  created_at: new Date(),
                  updated_at: new Date(),
               })
               .returningAll()
               .executeTakeFirstOrThrow();

            // 2. Insertar las tarifas múltiples (Bote, Viaje, etc.)
            if (data.tarifas && data.tarifas.length > 0) {
               const tarifasValues = data.tarifas.map((t) => ({
                  categoria_equipo_id: cat.id,
                  nombre: t.nombre,
                  medida_cobro_id: t.medida_cobro_id,
                  precio_unitario: t.precio_unitario,
                  cobra_minimo: t.cobra_minimo ?? null,
                  created_at: new Date(),
               }));

               await trx
                  .insertInto("categoria_equipo_tarifa")
                  .values(tarifasValues)
                  .execute();
            }

            return CategoriaEquipo.create({
               id: cat.id,
               nombre: cat.nombre,
               tarifas: data.tarifas,
               created_at: new Date(cat.created_at),
               updated_at: new Date(cat.updated_at),
            });
         });
      } catch (err: unknown) {
         if (this.isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipo | null> {
      try {
         return await this.db.transaction().execute(async (trx) => {
            // 1. Actualizamos los datos base de la categoría si vienen en el payload
            if (data.nombre !== undefined) {
               await trx
                  .updateTable("categoria_equipo")
                  .set({ nombre: data.nombre, updated_at: new Date() })
                  .where("id", "=", id)
                  .execute();
            }

            // 2. Si el payload incluye tarifas, las reemplazamos (Hard Replace)
            if (data.tarifas !== undefined) {
               // Borramos las tarifas antiguas de esta categoría
               await trx
                  .deleteFrom("categoria_equipo_tarifa")
                  .where("categoria_equipo_id", "=", id)
                  .execute();

               // Insertamos las nuevas
               if (data.tarifas.length > 0) {
                  const tarifasValues = data.tarifas.map((t) => ({
                     categoria_equipo_id: id,
                     nombre: t.nombre,
                     medida_cobro_id: t.medida_cobro_id,
                     precio_unitario: t.precio_unitario,
                     cobra_minimo: t.cobra_minimo ?? null,
                     created_at: new Date(),
                  }));

                  await trx
                     .insertInto("categoria_equipo_tarifa")
                     .values(tarifasValues)
                     .execute();
               }
            }

            // 3. Traemos el registro completo actualizado usando la misma lógica de findById
            const row = await trx
               .selectFrom("categoria_equipo as ce")
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
               .where("ce.id", "=", id)
               .groupBy(["ce.id"])
               .executeTakeFirst();

            if (!row) return null;

            return CategoriaEquipo.create({
               id: row.id,
               nombre: row.nombre,
               tarifas: row.tarifas,
               created_at: new Date(row.created_at),
               updated_at: new Date(row.updated_at),
            });
         });
      } catch (err: unknown) {
         if (this.isUniqueViolation(err)) {
            throw new Error("Ya existe una categoría con ese nombre");
         }
         throw err;
      }
   }

   async delete(id: string): Promise<boolean> {
      try {
         return await this.db.transaction().execute(async (trx) => {
            // 1. Borramos primero las tarifas asociadas (tabla hija)
            await trx
               .deleteFrom("categoria_equipo_tarifa")
               .where("categoria_equipo_id", "=", id)
               .execute();

            // 2. Borramos la categoría base (tabla padre)
            const result = await trx
               .deleteFrom("categoria_equipo")
               .where("id", "=", id)
               .executeTakeFirst();

            return Number(result.numDeletedRows) > 0;
         });
      } catch (err: unknown) {
         // Si la base de datos lanza un error 23503, significa que la categoría
         // no se puede borrar porque está siendo usada por un "equipo"
         if (this.isFKViolation(err)) {
            throw new Error("No se puede eliminar la categoría porque tiene equipos asociados");
         }
         throw err;
      }
   }

   // Asegúrate de tener tu helper para la restricción de llave foránea
   private isFKViolation(err: unknown): boolean {
      return typeof err === "object" && err !== null && "code" in err && (err as any).code === "23503";
   }

   // Funciones auxiliares para errores de Postgres...
   private isUniqueViolation(err: unknown): boolean {
      return typeof err === "object" && err !== null && "code" in err && (err as any).code === "23505";
   }
}