// ⚠️ OPCIONAL — mejora recomendada, no obligatoria.
//
// Tu update() actual borra TODAS las tarifas de la categoría y las
// reinserta en cada edición, así que sus `id` cambian aunque el contenido
// sea idéntico. El módulo de Conduces ya es robusto a esto (usa
// ON DELETE SET NULL + snapshot de nombre en `conduce`, y ON DELETE CASCADE
// en `proyecto_tarifa`), así que NO es obligatorio que apliques este cambio.
//
// Pero si lo aplicas, los `id` de categoria_equipo_tarifa se mantienen
// estables entre ediciones (solo cambian si agregas/quitas una tarifa),
// lo cual es en general más sano para cualquier otro módulo que llegues a
// enlazar a esos ids en el futuro.
//
// Diferencia con tu archivo original: SOLO cambia el método `update()`.
// El resto (findById, findAll, create, delete) queda idéntico.

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
                     'nombre', cet.nombre,
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
            const cat = await trx
               .insertInto("categoria_equipo")
               .values({
                  nombre: data.nombre,
                  created_at: new Date(),
                  updated_at: new Date(),
               })
               .returningAll()
               .executeTakeFirstOrThrow();

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

   // ── ÚNICO MÉTODO QUE CAMBIA ──────────────────────────────────────────────
   // Antes: deleteFrom(categoria_equipo_tarifa) + insertInto(...) con TODO el
   // array → todos los id se regeneran siempre.
   // Ahora: upsert por id — actualiza las que ya existen (mismo id), inserta
   // las que no traen id o traen uno que ya no existe, y borra solo las que
   // el payload dejó de incluir. Los id de las tarifas que el usuario no tocó
   // quedan exactamente iguales.
   async update(id: string, data: UpdateCategoriaEquipoDTO): Promise<CategoriaEquipo | null> {
      try {
         return await this.db.transaction().execute(async (trx) => {
            if (data.nombre !== undefined) {
               await trx
                  .updateTable("categoria_equipo")
                  .set({ nombre: data.nombre, updated_at: new Date() })
                  .where("id", "=", id)
                  .execute();
            }

            if (data.tarifas !== undefined) {
               const existentes = await trx
                  .selectFrom("categoria_equipo_tarifa")
                  .select(["id"])
                  .where("categoria_equipo_id", "=", id)
                  .execute();
               const idsExistentes = new Set(existentes.map((e) => e.id));
               const idsEnviados = new Set(
                  data.tarifas.filter((t) => t.id && idsExistentes.has(t.id)).map((t) => t.id as string)
               );

               // Borra solo las que el payload dejó de incluir.
               const idsABorrar = [...idsExistentes].filter((eid) => !idsEnviados.has(eid));
               if (idsABorrar.length > 0) {
                  await trx
                     .deleteFrom("categoria_equipo_tarifa")
                     .where("id", "in", idsABorrar)
                     .execute();
               }

               // Actualiza las que traen un id que ya existía (mismo id → no rompe FKs).
               for (const t of data.tarifas) {
                  if (t.id && idsExistentes.has(t.id)) {
                     await trx
                        .updateTable("categoria_equipo_tarifa")
                        .set({
                           nombre: t.nombre,
                           medida_cobro_id: t.medida_cobro_id,
                           precio_unitario: t.precio_unitario,
                           cobra_minimo: t.cobra_minimo ?? null,
                        })
                        .where("id", "=", t.id)
                        .execute();
                  }
               }

               // Inserta las nuevas (sin id, o con un id que ya no existe).
               const nuevas = data.tarifas.filter((t) => !t.id || !idsExistentes.has(t.id));
               if (nuevas.length > 0) {
                  await trx
                     .insertInto("categoria_equipo_tarifa")
                     .values(
                        nuevas.map((t) => ({
                           categoria_equipo_id: id,
                           nombre: t.nombre,
                           medida_cobro_id: t.medida_cobro_id,
                           precio_unitario: t.precio_unitario,
                           cobra_minimo: t.cobra_minimo ?? null,
                           created_at: new Date(),
                        }))
                     )
                     .execute();
               }
            }

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
            await trx
               .deleteFrom("categoria_equipo_tarifa")
               .where("categoria_equipo_id", "=", id)
               .execute();

            const result = await trx
               .deleteFrom("categoria_equipo")
               .where("id", "=", id)
               .executeTakeFirst();

            return Number(result.numDeletedRows) > 0;
         });
      } catch (err: unknown) {
         if (this.isFKViolation(err)) {
            throw new Error("No se puede eliminar la categoría porque tiene equipos asociados");
         }
         throw err;
      }
   }

   private isFKViolation(err: unknown): boolean {
      return typeof err === "object" && err !== null && "code" in err && (err as any).code === "23503";
   }

   private isUniqueViolation(err: unknown): boolean {
      return typeof err === "object" && err !== null && "code" in err && (err as any).code === "23505";
   }
}