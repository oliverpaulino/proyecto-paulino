import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoRepository,
   CreateProyectoExpressDTO,
   ProyectoProps,
   ProyectoDetalleProps,
   TipoProyecto,
   LiquidacionExpressFacade,
   ProyectoTotales,
} from "../domain/proyecto.domain";
import { ConduceProps } from "../../conduce/domain/conduce.domain";

export class KyselyProyectoRepository implements IProyectoRepository {

   constructor(private readonly db: Kysely<DB>) { }

   async findAll(tipo?: TipoProyecto): Promise<ProyectoProps[]> {
      let query = this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.tipo_proyecto",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tipo_servicio_id",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.rentabilidad",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .orderBy("proyecto.created_at", "desc");

      if (tipo) {
         query = query.where("proyecto.tipo_proyecto", "=", tipo);
      }

      const rows = await query.execute();
      // El historial no necesita el detalle línea por línea, solo los totales
      // ya cacheados en la fila (incluyendo total_equipos, que antes NUNCA se
      // llenaba porque acá se pasaba `[]` fijo — ese era el bug de la tabla).
      return rows.map((r) => this.#mapRow(r, [], []));
   }

   async findById(id: string): Promise<ProyectoProps | null> {
      const row = await this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.tipo_proyecto",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tipo_servicio_id",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.rentabilidad",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .where("proyecto.id", "=", id)
         .executeTakeFirst();

      if (!row) return null;

      const detalle = await this.db
         .selectFrom("proyecto_detalle")
         .selectAll()
         .where("proyecto_id", "=", id)
         .execute();

      // conduces se deja en [] aquí a propósito: ProyectoService.getById()
      // lo combina llamando a ConduceRepository.findByProyectoId(), para no
      // duplicar el mapeo de dos subtipos (CAMION/EQUIPO_PESADO) en dos sitios.
      return this.#mapRow(row, detalle, []);
   }

   async findByClientId(clienteId: string): Promise<ProyectoProps[]> {
      const rows = await this.db
         .selectFrom("proyecto")
         .leftJoin("cliente", "cliente.id", "proyecto.cliente_id")
         .select([
            "proyecto.id",
            "proyecto.tipo_proyecto",
            "proyecto.estado",
            "proyecto.cliente_id",
            "proyecto.nombre",
            "cliente.nombre as cliente_nombre",
            "proyecto.tipo_servicio_id",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
            "proyecto.total_equipos",
            "proyecto.rentabilidad",
            "proyecto.notas",
            "proyecto.fecha_inicio",
            "proyecto.fecha_fin",
            "proyecto.created_at",
            "proyecto.updated_at",
         ])
         .where("proyecto.cliente_id", "=", clienteId)
         .orderBy("proyecto.created_at", "desc")
         .execute();

      console.log("Proyectos encontrados para cliente", clienteId, ":", rows.length);

      return rows.map((r) => this.#mapRow(r, [], []));
   }

   // ── Creación: SOLO cabecera + cargos/gastos manuales. El equipo ya no se ──
   // ── registra aquí: se agrega después vía conduces (ver conduce.service). ──
   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      const header = await this.db.transaction().execute(async (trx) => {
         const inserted = await trx
            .insertInto("proyecto")
            .values({
               nombre: data.nombre,
               tipo_proyecto: "EXPRESS",
               estado: "BORRADOR", // antes era COMPLETADO fijo; ahora el proyecto vive en el tiempo mientras se agregan conduces
               cliente_id: data.cliente_id,
               servicio_id: data.servicio_id ?? null,
               tipo_servicio_id: data.servicio_id ?? null,
               tarifa_servicio: data.tarifa_servicio ?? 0,
               notas: data.notas ?? null,
               fecha_inicio: data.fecha_inicio ?? new Date(),
               fecha_fin: null,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         const itemsCobrables = data.cargos_cobrables.map((c) => ({
            proyecto_id: inserted.id,
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            precio_unitario: c.precio_unitario,
            subtotal: c.cantidad * c.precio_unitario,
            es_cobrable: true,
         }));
         const itemsInternos = data.gastos_internos.map((g) => ({
            proyecto_id: inserted.id,
            descripcion: g.descripcion,
            cantidad: g.cantidad,
            precio_unitario: g.precio_unitario,
            subtotal: g.cantidad * g.precio_unitario,
            es_cobrable: false,
         }));
         const allItems = [...itemsCobrables, ...itemsInternos];

         if (allItems.length > 0) {
            await trx.insertInto("proyecto_detalle").values(allItems).execute();
         }

         return inserted;
      });

      // Los totales (tarifa_servicio + cargos - gastos) se calculan con la
      // misma rutina que usan los conduces, para no duplicar la fórmula.
      await this.recalcularTotales(header.id);

      const proyecto = await this.findById(header.id);
      return proyecto!;
   }

   async getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null> {
      const proyecto = await this.findById(id);
      if (!proyecto || proyecto.tipo_proyecto !== "EXPRESS") return null;

      return {
         nombre: proyecto.nombre,
         proyecto_id: id,
         cliente_nombre: proyecto.cliente_nombre ?? "",
         tarifa_servicio: proyecto.tarifa_servicio,
         cargos_cobrables: proyecto.detalle.filter((d) => d.es_cobrable),
         gastos_internos: proyecto.detalle.filter((d) => !d.es_cobrable),
         conduces: proyecto.conduces,
         total_cobrable: Number(proyecto.total_cobrable),
         total_gasto_interno: Number(proyecto.total_gasto_interno),
         rentabilidad: Number(proyecto.rentabilidad),
         fecha: proyecto.fecha_inicio,
      };
   }

   // ── NUEVO: recalcula total_cobrable / total_gasto_interno / total_equipos / ──
   // ── rentabilidad a partir de proyecto_detalle + conduce, y los persiste.  ──
   // ── Lo llama ConduceService después de crear/editar/borrar un conduce.    ──
   async recalcularTotales(proyectoId: string): Promise<ProyectoTotales> {
      const [proyecto, detalle, conduces] = await Promise.all([
         this.db
            .selectFrom("proyecto")
            .select(["tarifa_servicio"])
            .where("id", "=", proyectoId)
            .executeTakeFirst(),
         this.db
            .selectFrom("proyecto_detalle")
            .select(["subtotal", "es_cobrable"])
            .where("proyecto_id", "=", proyectoId)
            .execute(),
         this.db
            .selectFrom("conduce")
            .select(["subtotal", "es_cobrable"])
            .where("proyecto_id", "=", proyectoId)
            .execute(),
      ]);

      const tarifaServicio = Number(proyecto?.tarifa_servicio ?? 0);

      const totalEquiposCobrables = conduces
         .filter((c) => c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);
      const totalEquiposInternos = conduces
         .filter((c) => !c.es_cobrable)
         .reduce((sum, c) => sum + Number(c.subtotal), 0);

      const totalCargosCobrables = detalle
         .filter((d) => d.es_cobrable)
         .reduce((sum, d) => sum + Number(d.subtotal), 0);
      const totalGastosInternosDetalle = detalle
         .filter((d) => !d.es_cobrable)
         .reduce((sum, d) => sum + Number(d.subtotal), 0);

      const total_equipos = totalEquiposCobrables + totalEquiposInternos;
      const total_cobrable = tarifaServicio + totalEquiposCobrables + totalCargosCobrables;
      const total_gasto_interno = totalEquiposInternos + totalGastosInternosDetalle;
      const rentabilidad = total_cobrable - total_gasto_interno;

      await this.db
         .updateTable("proyecto")
         .set({
            total_cobrable,
            total_gasto_interno,
            total_equipos,
            rentabilidad,
            updated_at: new Date(),
         })
         .where("id", "=", proyectoId)
         .execute();

      return { total_cobrable, total_gasto_interno, total_equipos, rentabilidad };
   }

   // ─── Mapper privado ────────────────────────────────────────────────────────
   #mapRow(
      row: Record<string, unknown>,
      detalle: Array<Record<string, unknown>>,
      conduces: ConduceProps[] = []
   ): ProyectoProps {
      const tipo = row.tipo_proyecto as string;

      const mappedDetalle: ProyectoDetalleProps[] = detalle.map((d) => ({
         id: d.id as string,
         proyecto_id: d.proyecto_id as string,
         descripcion: d.descripcion as string,
         cantidad: Number(d.cantidad),
         precio_unitario: Number(d.precio_unitario),
         subtotal: Number(d.subtotal),
         es_cobrable: d.es_cobrable as boolean,
         created_at: new Date(d.created_at as string),
         updated_at: new Date(d.updated_at as string),
      }));

      const base = {
         id: row.id as string,
         estado: row.estado as ProyectoProps["estado"],
         cliente_id: row.cliente_id as string,
         nombre: row.nombre as string,
         cliente_nombre: (row.cliente_nombre as string) ?? undefined,
         total_cobrable: Number(row.total_cobrable),
         total_gasto_interno: Number(row.total_gasto_interno),
         total_equipos: Number(row.total_equipos ?? 0),
         rentabilidad: Number(row.rentabilidad),
         notas: (row.notas as string) ?? null,
         fecha_inicio: new Date(row.fecha_inicio as string),
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin as string) : null,
         created_at: new Date(row.created_at as string),
         updated_at: new Date(row.updated_at as string),
         detalle: mappedDetalle,
         conduces,
      };

      if (tipo === "EXPRESS") {
         return {
            ...base,
            tipo_proyecto: "EXPRESS",
            tarifa_servicio: Number(row.tarifa_servicio ?? 0),
         };
      }
      if (tipo === "GRANDE") return { ...base, tipo_proyecto: "GRANDE" };
      return { ...base, tipo_proyecto: "NORMAL" };
   }
}