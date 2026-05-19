import { Hono } from "hono";
import db from "@/backend/database";

const clientsRoute = new Hono();
const repo = new KyselyClientRepository(db);
const service = new ClientService(repo);

// GET /api/clients
clientsRoute.get("/", async (c) => {
   const clients = await service.getAll();
   return c.json(clients);
});

// GET /api/clients/:id
clientsRoute.get("/:id", async (c) => {
   const client = await service.getById(c.req.param("id"));
   if (!client) return c.json({ error: "Cliente no encontrado" }, 404);
   return c.json(client);
});

// POST /api/clients
clientsRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const client = await service.create(body);
      return c.json(client, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/clients/:id
clientsRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const client = await service.update(c.req.param("id"), body);
      if (!client) return c.json({ error: "Cliente no encontrado" }, 404);
      return c.json(client);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/clients/:id
clientsRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Cliente no encontrado" }, 404);
   return c.json({ success: true });
});

export default clientsRoute;