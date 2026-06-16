import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateEquipoDTO,
   Equipo,
   EstadoEquipo,
   IEquipoRepository,
   TipoEquipo,
   UpdateEquipoDTO,
} from "../domain/equipo.domain";

// PG numeric(10,2) comes back as a string; smallint as number. Normalize both.
type EquipoRow = {
   id: string;
   nombre: string;
   tipo: string;
   estado: string;
   costo_por_hora: number | string;
   placa: string | null;
   modelo: string | null;
   ano: number | string | null;
   created_at: Date;
   updated_at: Date;
};

function toDomain(row: EquipoRow): Equipo {
   return Equipo.create({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo as TipoEquipo,
      estado: row.estado as EstadoEquipo,
      costo_por_hora: Number(row.costo_por_hora),
      placa: row.placa,
      modelo: row.modelo,
      ano: row.ano == null ? null : Number(row.ano),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
   });
}

export class KyselyEquipoRepository implements IEquipoRepository {
   constructor(private readonly db: Kysely<DB>) { }

   async findAll(): Promise<Equipo[]> {
      const rows = await this.db
         .selectFrom("equipo")
         .selectAll()
         .orderBy("created_at", "desc")
         .execute();

      return rows.map(toDomain);
   }

   async findById(id: string): Promise<Equipo | null> {
      const row = await this.db
         .selectFrom("equipo")
         .selectAll()
         .where("id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return toDomain(row);
   }

   async create(data: CreateEquipoDTO): Promise<Equipo> {
      const row = await this.db
         .insertInto("equipo")
         .values({
            nombre: data.nombre,
            tipo: data.tipo,
            estado: data.estado ?? "ACTIVO",
            costo_por_hora: data.costo_por_hora ?? 0,
            placa: data.placa ?? null,
            modelo: data.modelo ?? null,
            ano: data.ano ?? null,
         })
         .returningAll()
         .executeTakeFirstOrThrow();

      return toDomain(row);
   }

   async update(id: string, data: UpdateEquipoDTO): Promise<Equipo | null> {
      const row = await this.db
         .updateTable("equipo")
         .set({ ...data, updated_at: new Date() })
         .where("id", "=", id)
         .returningAll()
         .executeTakeFirst();

      if (!row) return null;
      return toDomain(row);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("equipo")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }
}
