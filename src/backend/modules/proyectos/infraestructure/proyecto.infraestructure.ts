import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import type {
   IProyectoRepository,
   CreateProyectoExpressDTO,
   ProyectoProps,
   ProyectoDetalleProps,
   ProyectoAsignacionProps,
   TipoProyecto,
   LiquidacionExpressFacade,
   ProyectoEquipoDetalleProps,
} from "../domain/proyecto.domain";

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
            "cliente.nombre as cliente_nombre",
            "proyecto.tipo_servicio_id",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
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
            "cliente.nombre as cliente_nombre",
            "proyecto.tipo_servicio_id",
            "proyecto.tarifa_servicio",
            "proyecto.total_cobrable",
            "proyecto.total_gasto_interno",
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

      const [detalle, asignaciones, equiposDetalleRaw] = await Promise.all([
         this.db
            .selectFrom("proyecto_detalle")
            .selectAll()
            .where("proyecto_id", "=", id)
            .execute(),
         this.db
            .selectFrom("proyecto_asignacion")
            .leftJoin("empleado", "empleado.id", "proyecto_asignacion.empleado_id")
            .leftJoin("equipo", "equipo.id", "proyecto_asignacion.equipo_id")
            .select([
               "proyecto_asignacion.id",
               "proyecto_asignacion.proyecto_id",
               "proyecto_asignacion.empleado_id",
               "empleado.nombre as empleado_nombre",
               "proyecto_asignacion.equipo_id",
               "equipo.nombre as equipo_nombre",
               "proyecto_asignacion.horas_trabajadas",
            ])
            .where("proyecto_asignacion.proyecto_id", "=", id)
            .execute(),
         this.db
            .selectFrom("proyecto_equipos")
            .innerJoin("proyecto_tarifas", "proyecto_tarifas.id", "proyecto_equipos.proyecto_tarifa_id")
            .innerJoin("equipo", "equipo.id", "proyecto_equipos.equipo_id")
            .innerJoin("categoria_equipo", "categoria_equipo.id", "proyecto_tarifas.categoria_equipo_id")
            .leftJoin("operador", "operador.id", "proyecto_equipos.operador_id")
            .leftJoin("empleado", "empleado.id", "operador.empleado_id")
            .select([
               "proyecto_equipos.id",
               "proyecto_equipos.equipo_id",
               "equipo.nombre as equipo_nombre",
               "proyecto_equipos.operador_id",
               "empleado.nombre as operador_nombre",
               "proyecto_tarifas.categoria_equipo_id",
               "categoria_equipo.nombre as categoria_nombre",
               "proyecto_equipos.cantidad",
               "proyecto_tarifas.precio_acordado",
               "proyecto_tarifas.cobra_en_snapshot",
               "proyecto_equipos.es_cobrable",
            ])
            .where("proyecto_equipos.proyecto_id", "=", id)
            .execute(),
      ]);

      const equiposDetalle: ProyectoEquipoDetalleProps[] = equiposDetalleRaw.map((e) => ({
         id: e.id,
         equipo_id: e.equipo_id,
         equipo_nombre: e.equipo_nombre ?? undefined,
         operador_id: e.operador_id,
         operador_nombre: (e.operador_nombre as string) ?? undefined,
         categoria_equipo_id: e.categoria_equipo_id,
         categoria_nombre: (e.categoria_nombre as string) ?? undefined,
         cantidad: Number(e.cantidad),
         precio_acordado: Number(e.precio_acordado),
         cobra_en_snapshot: e.cobra_en_snapshot,
         subtotal: Number(e.cantidad) * Number(e.precio_acordado),
         es_cobrable: e.es_cobrable,
      }));

      return this.#mapRow(row, detalle, asignaciones, equiposDetalle);


   }

   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      return await this.db.transaction().execute(async (trx) => {
         // 1 — Snapshot del nombre del servicio (si existe en tu BD)
         let nombreServicio = "Desconocido";

         if (data.servicio_id) {
            const servicio = await trx
               .selectFrom("servicios")
               .select(["nombre"])
               .where("id", "=", data.servicio_id)
               .executeTakeFirst();
            if (servicio) nombreServicio = servicio.nombre;
         }
         // const nombreServicio = servicio ? servicio.nombre : "Desconocido";

         // 2 — Cabecera: estado COMPLETADO para Express
         console.log(data.tarifa_servicio, "TARIFA SERVICIO");
         const header = await trx
            .insertInto("proyecto")
            .values({
               nombre: data.nombre,
               tipo_proyecto: "EXPRESS",
               estado: "COMPLETADO",
               cliente_id: data.cliente_id,
               servicio_id: data.servicio_id ?? null,
               tipo_servicio_id: data.servicio_id ?? null,
               tarifa_servicio: data.tarifa_servicio ?? 0,

               notas: data.notas ?? null,
               fecha_inicio: data.fecha_inicio ?? new Date(),
               fecha_fin: new Date(),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         // 3 — Insertar Tarifas (El nuevo esquema)
         const tarifasToInsert = data.tarifas.map((t) => ({
            proyecto_id: header.id,
            categoria_equipo_id: t.categoria_equipo_id,
            precio_acordado: t.precio_acordado,
            cobra_en_snapshot: t.cobra_en_snapshot,
            cobra_minimo_snapshot: t.cobra_minimo_snapshot,
         }));

         const insertedTarifas = await trx
            .insertInto("proyecto_tarifas") // <-- Singular, según tu base de datos
            .values(tarifasToInsert)
            .returningAll()
            .execute();

         // 4 — Asignar Equipos Físicos (El nuevo esquema)
         const equiposToInsert = data.equipos?.map((e) => {
            const tarifa = insertedTarifas.find(t => t.categoria_equipo_id === e.categoria_equipo_id);
            if (!tarifa) throw new Error(`Inconsistencia: No se encontró tarifa para categoría ${e.categoria_equipo_id}`);
            return {
               proyecto_id: header.id,
               equipo_id: e.equipo_id,
               operador_id: e.operador_id || null,
               proyecto_tarifa_id: tarifa.id,
               cantidad: e.cantidad,
               es_cobrable: e.es_cobrable,
            };
         });

         const insertedEquipos = await trx.insertInto("proyecto_equipos").values(equiposToInsert || []).returningAll().execute();

         // 5 — Cargos y Gastos (Detalles)
         const itemsCobrables = data.cargos_cobrables.map((c) => ({
            proyecto_id: header.id,
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            precio_unitario: c.precio_unitario,
            subtotal: c.cantidad * c.precio_unitario,
            es_cobrable: true,
         }));
         const itemsInternos = data.gastos_internos.map((g) => ({
            proyecto_id: header.id,
            descripcion: g.descripcion,
            cantidad: g.cantidad,
            precio_unitario: g.precio_unitario,
            subtotal: g.cantidad * g.precio_unitario,
            es_cobrable: false,
         }));

         const allItems = [...itemsCobrables, ...itemsInternos];
         const insertedDetalle = allItems.length > 0
            ? await trx.insertInto("proyecto_detalle").values(allItems).returningAll().execute()
            : [];

         // 6 — Calcular totales financieros
         const total_cobrable_tarifas = insertedTarifas.reduce((sum, t) => sum + Number(t.precio_acordado), 0);
         const total_cobrable_cargos = insertedDetalle.filter(i => i.es_cobrable).reduce((sum, i) => sum + Number(i.subtotal), 0);
         const total_cobrable_equipos = insertedEquipos
            .filter(e => e.es_cobrable)
            .reduce((sum, e) => {
               const tarifa = insertedTarifas.find(t => t.id === e.proyecto_tarifa_id);
               return sum + Number(e.cantidad) * Number(tarifa?.precio_acordado ?? 0);
            }, 0);

         const total_cobrable = total_cobrable_equipos + total_cobrable_cargos;


         const total_gasto_interno = insertedDetalle.filter(i => !i.es_cobrable).reduce((sum, i) => sum + Number(i.subtotal), 0);
         const rentabilidad = total_cobrable - total_gasto_interno;

         // 7 — Actualizar totales en la cabecera
         await trx
            .updateTable("proyecto")
            .set({ total_cobrable, total_gasto_interno, rentabilidad, updated_at: new Date() })
            .where("id", "=", header.id)
            .execute();

         // 8 — Retornar el DTO mapeado (asignaciones vacías porque la estructura vieja cambió)
         return this.#mapRow(
            { ...header, total_cobrable, total_gasto_interno, rentabilidad, cliente_nombre: null },
            insertedDetalle,
            []
         );
      });
   }

   async getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null> {
      const proyecto = await this.findById(id);
      if (!proyecto || proyecto.tipo_proyecto !== "EXPRESS") return null;

      const asignacion = proyecto.asignaciones[0];

      return {
         proyecto_id: id,
         cliente_nombre: proyecto.cliente_nombre ?? "",
         tarifa_servicio: proyecto.tipo_proyecto === "EXPRESS" ? proyecto.tarifa_servicio : 0,
         cargos_cobrables: proyecto.detalle.filter((d) => d.es_cobrable),
         gastos_internos: proyecto.detalle.filter((d) => !d.es_cobrable),
         total_cobrable: Number(proyecto.total_cobrable),
         total_gasto_interno: Number(proyecto.total_gasto_interno),
         rentabilidad: Number(proyecto.rentabilidad),
         operador_nombre: asignacion?.operador_nombre ?? "",
         equipo_nombre: asignacion?.equipo_nombre ?? "",
         horas_trabajadas: asignacion?.horas_trabajadas ?? 0,
         fecha: proyecto.fecha_inicio,
      };
   }

   async createExpressTransaction(data: CreateProyectoExpressDTO) {
      // La infraestructura maneja el 'trx' (transacción de base de datos) de forma aislada
      return await this.db.transaction().execute(async (trx) => {
         // 1. Snapshot del nombre del servicio
         const servicio = await trx
            .selectFrom("servicios")
            .select(["nombre"])
            .where("id", "=", data.servicio_id)
            .executeTakeFirst();

         const nombreServicio = servicio ? servicio.nombre : "Desconocido";

         // 2. Crear Proyecto
         const newProject = await trx
            .insertInto("proyecto")
            .values({
               tipo_proyecto: "EXPRESS", // <-- AQUÍ ESTÁ LA SOLUCIÓN
               estado: "COMPLETADO",
               cliente_id: data.cliente_id,
               servicio_id: data.servicio_id,
               nombre: data.nombre,
               fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio) : new Date(),
               tipo_servicio_snapshot: nombreServicio,
               // created_by: userId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         // 3. Insertar Tarifas (Snapshot)
         const tarifasToInsert = data.tarifas.map((t) => ({
            proyecto_id: newProject.id,
            categoria_equipo_id: t.categoria_equipo_id,
            precio_acordado: t.precio_acordado,
            cobra_en_snapshot: t.cobra_en_snapshot,
            cobra_minimo_snapshot: t.cobra_minimo_snapshot,
         }));

         const insertedTarifas = await trx
            .insertInto("proyecto_tarifas")
            .values(tarifasToInsert)
            .returningAll()
            .execute();

         // 4. Asignar Equipos Físicos
         if (data.equipos && data.equipos.length > 0) {
            const equiposToInsert = data.equipos.map((e) => {
               const tarifa = insertedTarifas.find(
                  (t) => t.categoria_equipo_id === e.categoria_equipo_id
               );

               if (!tarifa) {
                  throw new Error(`Inconsistencia: No se encontró tarifa para la categoría ${e.categoria_equipo_id}`);
               }

               return {
                  proyecto_id: newProject.id,
                  equipo_id: e.equipo_id,
                  operador_id: e.operador_id || null,
                  proyecto_tarifa_id: tarifa.id, // Enlace crucial
                  cantidad: e.cantidad ?? 1,
                  es_cobrable: e.es_cobrable ?? true,
               };
            });

            await trx
               .insertInto("proyecto_equipos")
               .values(equiposToInsert)
               .execute();
         }

         return newProject;
      });
   }


   // ─── Mapper privado ────────────────────────────────────────────────────────
   #mapRow(
      row: Record<string, unknown>,
      detalle: Array<Record<string, unknown>>,
      asignaciones: Array<Record<string, unknown>>,
      equiposDetalle: ProyectoEquipoDetalleProps[] = []
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

      const mappedAsignaciones: ProyectoAsignacionProps[] = asignaciones.map((a) => ({
         id: a.id as string,
         proyecto_id: a.proyecto_id as string,
         operador_id: a.operador_id as string,
         operador_nombre: a.operador_nombre as string | undefined,
         equipo_id: a.equipo_id as string,
         equipo_nombre: a.equipo_nombre as string | undefined,
         horas_trabajadas: Number(a.horas_trabajadas),


      }));

      const base = {
         id: row.id as string,
         estado: row.estado as ProyectoProps["estado"],
         cliente_id: row.cliente_id as string,
         cliente_nombre: (row.cliente_nombre as string) ?? undefined,
         total_cobrable: Number(row.total_cobrable),
         total_gasto_interno: Number(row.total_gasto_interno),
         rentabilidad: Number(row.rentabilidad),
         notas: (row.notas as string) ?? null,
         fecha_inicio: new Date(row.fecha_inicio as string),
         fecha_fin: row.fecha_fin ? new Date(row.fecha_fin as string) : null,
         created_at: new Date(row.created_at as string),
         updated_at: new Date(row.updated_at as string),
         detalle: mappedDetalle,
         asignaciones: mappedAsignaciones,
         equiposDetalle,
      };

      if (tipo === "EXPRESS") {
         return {
            ...base,
            tipo_proyecto: "EXPRESS",
            tipo_servicio_id: (row.tipo_servicio_id as string) ?? null,
            tarifa_servicio: Number(row.tarifa_servicio ?? 0),
         };
      }
      if (tipo === "GRANDE") return { ...base, tipo_proyecto: "GRANDE" };
      return { ...base, tipo_proyecto: "NORMAL" };
   }
}
