import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyClientRepository } from "../infraestructure/clients.infraestructure";
import { ClientService } from "../service/clients.service";
import { uuidv4 } from "zod";
import { catchError } from "@/lib/utils";
import { Contact } from "@/dtos/client.dto";
import { auth } from "@/lib/auth";

const clientsRoute = new Hono();
const repo = new KyselyClientRepository(db);
const service = new ClientService(repo);

clientsRoute.post("/contacts", async (c) => {
   const contactForm = await c.req.json();
   const session = await auth.api.getSession({
      headers: c.req.raw.headers,
   });

   if (!session) {
      return c.json({ message: "missing session" }, 403);
   }
   const orgId = session.session.activeOrganizationId ?? "";

   const id = uuidv4().toString();
   const [error, insertedContact] = await catchError(
      db
         .insertInto("contact")
         .values({
            id: id,
            client_id: contactForm.client_id,
            name: contactForm.name,
            email: contactForm.email,
            phone: contactForm.phone,
            job_title: contactForm.job_title,
            created_at: new Date(),
            updated_at: new Date(),
         })
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) {
      return c.json({ error }, 400);
   }
   const contact: Contact = {
      id: insertedContact.id,
      client_id: insertedContact.client_id,
      name: insertedContact.name,
      email: insertedContact.email ?? undefined,
      phone: insertedContact.phone ?? undefined,
      job_title: insertedContact.job_title ?? undefined,
      created_at: insertedContact.created_at ? new Date(insertedContact.created_at).toISOString() : undefined,
      updated_at: insertedContact.updated_at ? new Date(insertedContact.updated_at).toISOString() : undefined,
   };

   return c.json({ data: contact });
});

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