import { Kysely } from "kysely";
import {
   ITareaRepository,
   CreateTareaDTO,
   UpdateTareaDTO,
   Tarea,
   EstadoTarea,
   ProyectoOption,
   SIN_PROYECTO,
} from "../domain/tareas.domain";
import { DB } from "@/backend/database";

/** Coerce a Date | string | null | undefined into a Date | null for date columns. */
function toDateOrNull(value: Date | string | null | undefined): Date | null {
   if (value === null || value === undefined) return null;
   return value instanceof Date ? value : new Date(value);
}

export class KyselyTareaRepository implements ITareaRepository {
   constructor(private readonly db: Kysely<DB>) { }

   private toEntity(row: {
      id: string;
      proyecto_id: string | null;
      nombre: string;
      descripcion: string | null;
      estado: string;
      fecha_inicio: Date | null;
      fecha_fin: Date | null;
      created_at: Date;
      updated_at: Date;
   }): Tarea {
      return Tarea.create({
         ...row,
         estado: row.estado as EstadoTarea,
         fecha_inicio: row.fecha_inicio ? new Date(row.fecha_inicio) : null,
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin) : null,
         created_at: new Date(row.created_at),
         updated_at: new Date(row.updated_at),
      });
   }

   async findAll(proyectoId?: string): Promise<Tarea[]> {
      let query = this.db.selectFrom("tarea").selectAll();

      if (proyectoId === SIN_PROYECTO) {
         // Solo tareas sueltas (sin proyecto asignado).
         query = query.where("proyecto_id", "is", null);
      } else if (proyectoId) {
         query = query.where("proyecto_id", "=", proyectoId);
      }

      const rows = await query.orderBy("created_at", "desc").execute();
      return rows.map((row) => this.toEntity(row));
   }

   async findById(id: string): Promise<Tarea | null> {
      const row = await this.db
         .selectFrom("tarea")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return this.toEntity(row);
   }

   async create(data: CreateTareaDTO): Promise<Tarea> {
      const row = await this.db
         .insertInto("tarea")
         .values({
            proyecto_id: data.proyecto_id ?? null,
            nombre: data.nombre,
            descripcion: data.descripcion ?? null,
            estado: data.estado ?? "PENDIENTE",
            fecha_inicio: toDateOrNull(data.fecha_inicio),
            fecha_fin: toDateOrNull(data.fecha_fin),
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return this.toEntity(row);
   }

   async update(id: string, data: UpdateTareaDTO): Promise<Tarea | null> {
      const patch: Record<string, unknown> = { updated_at: new Date() };
      if (data.proyecto_id !== undefined) patch.proyecto_id = data.proyecto_id;
      if (data.nombre !== undefined) patch.nombre = data.nombre;
      if (data.descripcion !== undefined) patch.descripcion = data.descripcion;
      if (data.estado !== undefined) patch.estado = data.estado;
      if (data.fecha_inicio !== undefined) patch.fecha_inicio = toDateOrNull(data.fecha_inicio);
      if (data.fecha_fin !== undefined) patch.fecha_fin = toDateOrNull(data.fecha_fin);

      const row = await this.db
         .updateTable("tarea")
         .set(patch)
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return this.toEntity(row);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("tarea")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   async listProyectos(): Promise<ProyectoOption[]> {
      const rows = await this.db
         .selectFrom("proyecto")
         .select(["id", "nombre"])
         .orderBy("nombre", "asc")
         .execute();

      return rows.map((r) => ({ id: r.id, nombre: r.nombre }));
   }
}
