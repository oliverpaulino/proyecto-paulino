import { Kysely } from "kysely";
import { DB } from "@/backend/database";
import {
   CreateEquipoDTO,
   Equipo,
   EstadoEquipo,
   IEquipoRepository,
   UpdateEquipoDTO,
} from "../domain/equipo.domain";
import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";

type EquipoRow = {
   id: string;
   nombre: string;
   categoria_id: string;
   operador_id: string | null;
   categoria_nombre: string;
   cobra_en: string;
   cobra_minimo: number | string | null;
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
      categoria_id: row.categoria_id,
      operador_id: row.operador_id,
      categoria_nombre: row.categoria_nombre,
      cobra_en: row.cobra_en,
      cobra_minimo: row.cobra_minimo == null ? null : Number(row.cobra_minimo),
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

   async findAll(params?: { page?: number; limit?: number; search?: string }): Promise<Equipo[]> {
      const { page = 1, limit = 10, search = "" } = params || {};
      let qb = this.db
         .selectFrom("equipo")
         .innerJoin("categoria_equipo", "categoria_equipo.id", "equipo.categoria_id")
         .select([
            "equipo.id",
            "equipo.nombre",
            "equipo.categoria_id",
            "categoria_equipo.nombre as categoria_nombre",
            "categoria_equipo.cobra_en",
            "categoria_equipo.cobra_minimo",
            "equipo.estado",
            "equipo.costo_por_hora",
            "equipo.placa",
            "equipo.modelo",
            "equipo.ano",
            "equipo.operador_id",
            "equipo.created_at",
            "equipo.updated_at",
         ])
         .orderBy("equipo.created_at", "desc");


      if (search) {
         qb = qb.where((eb) =>
            eb.or([
               eb("equipo.nombre", "like", `%${search}%`),
               eb("categoria_equipo.nombre", "like", `%${search}%`),
            ])
         );
      }

      const rows = await qb.offset((page - 1) * limit).limit(limit).execute();

      return rows.map(toDomain);
   }

   async findById(id: string): Promise<Equipo | null> {
      const row = await this.db
         .selectFrom("equipo")
         .innerJoin("categoria_equipo", "categoria_equipo.id", "equipo.categoria_id")
         .select([
            "equipo.id",
            "equipo.nombre",
            "equipo.categoria_id",
            "categoria_equipo.nombre as categoria_nombre",
            "categoria_equipo.cobra_en",
            "categoria_equipo.cobra_minimo",
            "equipo.estado",
            "equipo.costo_por_hora",
            "equipo.placa",
            "equipo.modelo",
            "equipo.ano",
            "equipo.operador_id",
            "equipo.created_at",
            "equipo.updated_at",
         ])
         .where("equipo.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;
      return toDomain(row);
   }

   async create(data: CreateEquipoDTO): Promise<Equipo> {
      const row = await this.db
         .insertInto("equipo")
         .values({
            nombre: data.nombre,
            categoria_id: data.categoria_id,
            estado: data.estado ?? "ACTIVO",
            costo_por_hora: data.costo_por_hora ?? 0,
            placa: data.placa ?? null,
            modelo: data.modelo ?? null,
            ano: data.ano ?? null,
            operador_id: data.operador_id ?? null,
         })
         .returning("id")
         .executeTakeFirstOrThrow();

      const created = await this.findById(row.id);
      if (!created) throw new Error("Error al crear equipo");
      return created;
   }

   async update(id: string, data: UpdateEquipoDTO): Promise<Equipo | null> {
      const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
      await this.db
         .updateTable("equipo")
         .set(updateData)
         .where("id", "=", id)
         .execute();

      return this.findById(id);
   }

   async delete(id: string): Promise<boolean> {
      const result = await this.db
         .deleteFrom("equipo")
         .where("id", "=", id)
         .executeTakeFirst();

      return Number(result.numDeletedRows) > 0;
   }

   async findCategoriaByEquipoId(
      equipoId: string
   ): Promise<CategoriaEquipo | null> {
      const row = await this.db
         .selectFrom("equipo")
         .innerJoin(
            "categoria_equipo",
            "categoria_equipo.id",
            "equipo.categoria_id"
         )
         .select([
            "categoria_equipo.id",
            "categoria_equipo.nombre",
            "categoria_equipo.cobra_en",
            "categoria_equipo.cobra_minimo",
            "categoria_equipo.precio_unitario",
            "categoria_equipo.created_at",
            "categoria_equipo.updated_at",
         ])
         .where("equipo.id", "=", equipoId)
         .executeTakeFirst();

      if (!row) return null;

      return row;
   }
}
