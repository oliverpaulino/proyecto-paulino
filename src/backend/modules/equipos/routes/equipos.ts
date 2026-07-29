import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { KyselyEquipoRepository } from "../infraestructure/equipo.infraestructure";
import { EquipoService } from "../service/equipo.service";
import { EmployeeService } from "../../employees/service/employees.service";
import { KyselyEmployeeRepository } from "../../employees/infraestructure/employees.infraestructure";
import { KyselyMantenimientoRepository } from "../../mantenimientos/infraestructure/mantenimiento.infraestructure";
import { MantenimientoService } from "../../mantenimientos/service/mantenimiento.service";

const equiposRoute = new Hono();
const repo = new KyselyEquipoRepository(db);
const employeeRepo = new KyselyEmployeeRepository(db);
const service = new EquipoService(repo, employeeRepo);
const mantenimientoService = new MantenimientoService(new KyselyMantenimientoRepository(db));

// GET /api/equipos
equiposRoute.get("/", async (c) => {
   const page = parseInt(c.req.query("page") || "1", 10);
   const limit = parseInt(c.req.query("limit") || "10", 10);
   const search = c.req.query("search") || "";
   const equipos = await service.getAll({ page, limit, search });
   return c.json(equipos);
});

// GET /api/equipos/:id
equiposRoute.get("/:id", async (c) => {
   const equipo = await service.getById(c.req.param("id"));
   if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json(equipo);
});

// GET /api/equipos/:id/historial — state-change audit log
equiposRoute.get("/:id/historial", async (c) => {
   const historial = await service.getHistorial(c.req.param("id"));
   return c.json(historial);
});

// GET /api/equipos/:id/compras — purchase-order items registered against this equipo
equiposRoute.get("/:id/compras", async (c) => {
   const items = await service.getComprasItems(c.req.param("id"));
   return c.json(items);
});

// GET /api/equipos/:id/mantenimientos — bitácora de mantenimientos del equipo
equiposRoute.get("/:id/mantenimientos", async (c) => {
   const items = await mantenimientoService.getByEquipoId(c.req.param("id"));
   return c.json(items);
});

// GET /api/equipos/:id/mantenimiento-abierto — el registro que el diálogo de
// reactivación debe cerrar (null si no hay ninguno abierto).
equiposRoute.get("/:id/mantenimiento-abierto", async (c) => {
   const abierto = await mantenimientoService.getAbiertoByEquipoId(c.req.param("id"));
   return c.json(abierto);
});

// POST /api/equipos/:id/estado — change estado + record history
equiposRoute.post("/:id/estado", async (c) => {
   let body: { estado?: string; nota?: string };
   try {
      body = await c.req.json();
   } catch {
      return c.json({ error: "Cuerpo de solicitud inválido" }, 400);
   }
   if (!body.estado) {
      return c.json({ error: "Estado es requerido" }, 400);
   }

   const session = await auth.api.getSession({ headers: c.req.raw.headers });
   const userId = session?.user?.id ?? null;
   const userName = session?.user?.name ?? null;

   // Salir de mantenimiento exige cerrar el registro abierto primero. La UI ya
   // muestra el diálogo, pero la regla se aplica aquí para que no se pueda
   // saltar llamando la API directo.
   if (body.estado === "ACTIVO") {
      const equipoActual = await service.getById(c.req.param("id"));
      if (equipoActual?.estado === "EN_MANTENIMIENTO") {
         const abierto = await mantenimientoService.getAbiertoByEquipoId(c.req.param("id"));
         if (abierto) {
            return c.json(
               {
                  error:
                     "Debes cerrar el mantenimiento abierto antes de reactivar el equipo.",
                  mantenimiento_abierto: abierto,
               },
               409
            );
         }
      }
   }

   try {
      const equipo = await service.changeEstado(
         c.req.param("id"),
         body.estado,
         userId,
         userName,
         body.nota ?? null
      );
      if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
      return c.json(equipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// POST /api/equipos
equiposRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.create(body);
      return c.json(equipo, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/equipos/:id
equiposRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const equipo = await service.update(c.req.param("id"), body);
      if (!equipo) return c.json({ error: "Equipo no encontrado" }, 404);
      return c.json(equipo);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/equipos/:id
equiposRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Equipo no encontrado" }, 404);
   return c.json({ success: true });
});

equiposRoute.get(":id/categorias", async (c) => {
   const categorias = await service.getCategoriaByEquipoId(c.req.param("id"));
   // if (!categorias) return c.json({ error: "Categoría no encontrada" }, 404);
   return c.json(categorias);
})
equiposRoute.get(":id/operador", async (c) => {
   const operador = await service.getOperadorByEquipoId(c.req.param("id"));
   if (!operador) return c.json({ error: "Operador no encontrado" }, 200);
   return c.json(operador);
})

// GET /api/equipos/:id/historial-trabajo
equiposRoute.get("/:id/historial-trabajo", async (c) => {
   const rows = await db
      .selectFrom("proyecto_equipos")
      .innerJoin("proyecto", "proyecto.id", "proyecto_equipos.proyecto_id")
      .innerJoin("proyecto_tarifas", "proyecto_tarifas.id", "proyecto_equipos.proyecto_tarifa_id")
      .select([
         "proyecto.id as proyecto_id",
         "proyecto.nombre as proyecto_nombre",
         "proyecto.fecha_inicio",
         "proyecto_equipos.cantidad",
         "proyecto_equipos.es_cobrable",
         "proyecto_tarifas.precio_acordado",
      ])
      .where("proyecto_equipos.equipo_id", "=", c.req.param("id"))
      .orderBy("proyecto.fecha_inicio", "desc")
      .execute();

   return c.json(rows.map(r => ({
      ...r,
      subtotal: Number(r.cantidad) * Number(r.precio_acordado),
   })));
});

export default equiposRoute;
