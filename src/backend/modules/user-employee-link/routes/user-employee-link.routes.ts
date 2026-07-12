import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyUserEmployeeLinkRepository } from "../infraestructure/user-employee-link.infraestructure";
import { UserEmployeeLinkService } from "../service/user-employee-link.service";

const userEmployeeLinkRoute = new Hono();
const repo = new KyselyUserEmployeeLinkRepository(db);
const service = new UserEmployeeLinkService(repo);

// GET /api/user-employee-links
userEmployeeLinkRoute.get("/", async (c) => {
   const links = await service.getAll();
   return c.json(links);
});

// GET /api/user-employee-links/:id
userEmployeeLinkRoute.get("/:id", async (c) => {
   const link = await service.getById(c.req.param("id"));
   if (!link) return c.json({ error: "Vínculo no encontrado" }, 404);
   return c.json(link);
});

// GET /api/user-employee-links/user/:userId
userEmployeeLinkRoute.get("/user/:userId", async (c) => {
   const links = await service.getByUserId(c.req.param("userId"));
   return c.json(links);
});

// GET /api/user-employee-links/employee/:empleadoId
userEmployeeLinkRoute.get("/employee/:empleadoId", async (c) => {
   const link = await service.getByEmployeeId(c.req.param("empleadoId"));
   if (!link) return c.json({ error: "Vínculo no encontrado" }, 404);
   return c.json(link);
});

// POST /api/user-employee-links
userEmployeeLinkRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const link = await service.create(body);
      return c.json(link, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/user-employee-links/:id
userEmployeeLinkRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   const id = c.req.param("id");
   
   try {
      const link = await service.update(id, body);
      if (!link) return c.json({ error: "Vínculo no encontrado" }, 404);
      return c.json(link);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/user-employee-links/:id
userEmployeeLinkRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Vínculo no encontrado" }, 404);
   return c.json({ success: true });
});

export default userEmployeeLinkRoute;