import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyClientRepository } from "../infraestructure/clients.infraestructure";
import { ClientService } from "../service/clients.service";
import { catchError } from "@/lib/utils";
import { Contact } from "@/dtos/client.dto";

const clientsRoute = new Hono();
const repo = new KyselyClientRepository(db);
const service = new ClientService(repo);

clientsRoute.post("/contacts", async (c) => {
   const contactForm = await c.req.json();

   const [error, insertedContact] = await catchError(service.createContact(contactForm));

   if (error) {
      return c.json({ error: String(error) }, 400);
   }
   
   const contact: Contact = {
      id: insertedContact.id,
      client_id: insertedContact.client_id,
      name: insertedContact.name,
      email: insertedContact.email ?? undefined,
      phone: insertedContact.phone ?? undefined,
      job_title: insertedContact.job_title ?? undefined,
      created_at: new Date(insertedContact.created_at),
      updated_at: new Date(insertedContact.updated_at),
   };

   return c.json({ data: contact });
});

clientsRoute.get("/:id/contacts", async (c) => {
   const { id } = c.req.param();
   const contacts = await service.getContacts(id);

   return c.json({ contacts });
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

// Update client contact
clientsRoute.patch("/:id/contacts/:contactId", async (c) => {
   const body = await c.req.json();
   const id = c.req.param("id");
   const contactId = c.req.param("contactId");

   const [error, contact] = await catchError(service.updateContact(contactId, id, body));

   if (error) {
      console.log(error);
      return c.json({ error: String(error) }, 400);
   }
   return c.json({ contact });
});

clientsRoute.delete("/:id/contacts/:contactId", async (c) => {
   const { contactId, id } = c.req.param();

   const [error, result] = await catchError(service.deleteContact(contactId, id));

   if (error) {
      console.log(error);
      return c.json({ error: String(error) }, 400);
   }
   
   const successPayload = { numDeletedRows: result ? "1" : "0" };

   return c.json({ result: successPayload });
});

export default clientsRoute;