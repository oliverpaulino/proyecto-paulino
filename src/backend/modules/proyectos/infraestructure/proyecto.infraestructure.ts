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
} from "../domain/proyecto.domain";

export class KyselyProyectoRepository implements IProyectoRepository {
   static createExpressTransaction(data: CreateProyectoExpressDTO): ProyectoProps | PromiseLike<ProyectoProps> {
      throw new Error("Method not implemented.");
   }
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

      const [detalle, asignaciones] = await Promise.all([
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
      ]);

      return this.#mapRow(row, detalle, asignaciones);
   }

   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      const result = await this.db.transaction().execute(async (trx) => {
         // 1 — Cabecera: estado COMPLETADO de inmediato para proyectos Express
         const header = await trx
            .insertInto("proyecto")
            .values({
               nombre: data.nombre,
               tipo_proyecto: "EXPRESS",
               estado: "COMPLETADO",
               cliente_id: data.cliente_id,
               tipo_servicio_id: data.tipo_servicio_id ?? null,
               tarifa_servicio: data.tarifa_servicio,
               notas: data.notas ?? null,
               fecha_inicio: data.fecha_inicio ?? new Date(),
               fecha_fin: new Date(),
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         // 2 — Cargos cobrables: impactan la factura del cliente
         const itemsCobrables = data.cargos_cobrables.map((c) => ({
            proyecto_id: header.id,
            descripcion: c.descripcion,
            cantidad: c.cantidad,
            precio_unitario: c.precio_unitario,
            subtotal: c.cantidad * c.precio_unitario,
            es_cobrable: true,
         }));

         // 3 — Gastos internos: solo afectan rentabilidad, no factura
         const itemsInternos = data.gastos_internos.map((g) => ({
            proyecto_id: header.id,
            descripcion: g.descripcion,
            cantidad: g.cantidad,
            precio_unitario: g.precio_unitario,
            subtotal: g.cantidad * g.precio_unitario,
            es_cobrable: false,
         }));

         const allItems = [...itemsCobrables, ...itemsInternos];
         const insertedDetalle =
            allItems.length > 0
               ? await trx
                  .insertInto("proyecto_detalle")
                  .values(allItems)
                  .returningAll()
                  .execute()
               : [];

         // 4 — Asignación obligatoria operador + equipo
         const asignacion = await trx
            .insertInto("proyecto_asignacion")
            .values({
               proyecto_id: header.id,
               empleado_id: data.empleado_id,
               equipo_id: data.equipo_id,
               horas_trabajadas: data.horas_trabajadas,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

         // 5 — Calcular totales
         const total_cobrable =
            data.tarifa_servicio +
            insertedDetalle
               .filter((i) => i.es_cobrable)
               .reduce((sum, i) => sum + Number(i.subtotal), 0);

         const total_gasto_interno = insertedDetalle
            .filter((i) => !i.es_cobrable)
            .reduce((sum, i) => sum + Number(i.subtotal), 0);

         const rentabilidad = total_cobrable - total_gasto_interno;

         // 6 — Actualizar totales en la cabecera
         await trx
            .updateTable("proyecto")
            .set({ total_cobrable, total_gasto_interno, rentabilidad, updated_at: new Date() })
            .where("id", "=", header.id)
            .execute();

         return {
            header: { ...header, total_cobrable, total_gasto_interno, rentabilidad },
            detalle: insertedDetalle,
            asignacion,
         };
      });

      return this.#mapRow(
         { ...result.header, cliente_nombre: null },
         result.detalle,
         [{ ...result.asignacion, empleado_nombre: null, equipo_nombre: null }]
      );
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
         empleado_nombre: asignacion?.empleado_nombre ?? "",
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
      asignaciones: Array<Record<string, unknown>>
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
         empleado_id: a.empleado_id as string,
         empleado_nombre: a.empleado_nombre as string | undefined,
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
