import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyClientRepository } from "../infraestructure/clients.infraestructure";
import { ClientService } from "../service/clients.service";
import crypto from "crypto";
import { catchError } from "@/lib/utils";
import { Contact } from "@/dtos/client.dto";
import { auth } from "@/lib/auth";
import { DeleteResult } from "kysely";

const clientsRoute = new Hono();
const repo = new KyselyClientRepository(db);
const service = new ClientService(repo);

clientsRoute.post("/contacts", async (c) => {
   const contactForm = await c.req.json();
   // const session = await auth.api.getSession({
   //    headers: c.req.raw.headers,
   // });

   // if (!session) {
   //    return c.json({ message: "missing session" }, 403);
   // }

   const id = crypto.randomUUID();
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
      created_at: new Date(insertedContact.created_at),
      updated_at: new Date(insertedContact.updated_at),
   };

   return c.json({ data: contact });
});


clientsRoute.get("/:id/contacts", async (c) => {
   const { id } = c.req.param();
   // const session = await auth.api.getSession({ headers: c.req.raw.headers });
   // if (!session) return c.json({ message: "missing session" }, 403);
   // const orgId = session.session.activeOrganizationId ?? "";
   const contacts = await db
      .selectFrom("contact")
      .selectAll()
      .where("client_id", "=", id)
      .execute();

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


// // Update client
clientsRoute.patch("/:id/contacts/:contactId", async (c) => {
   // const session = await auth.api.getSession({
   //    headers: c.req.raw.headers,
   // });

   // if (!session) {
   //    return c.json({ message: "missing session" }, 403);
   // }

   // const orgId = session.session.activeOrganizationId ?? "";
   const body = await c.req.json();
   const updateData = {
      ...body,
      created_at: body.created_at ? new Date(body.created_at) : undefined,
      updated_at: body.updated_at ? new Date(body.updated_at) : undefined,
   };
   const id = c.req.param("id");
   const contactId = c.req.param("contactId");

   const [error, contact] = await catchError(
      db
         .updateTable("contact")
         .set(updateData)
         .where("id", "=", contactId)
         // .where("organization_id", "=", orgId)
         .where("client_id", "=", id)
         .returningAll()
         .executeTakeFirstOrThrow()
   );

   if (error) {
      console.log(error);
      return c.json({ error }, 400);
   }
   return c.json({ contact });
});

clientsRoute.delete("/:id/contacts/:contactId", async (c) => {
   // const session = await auth.api.getSession({
   //    headers: c.req.raw.headers,
   // });

   // if (!session) {
   //    return c.json({ message: "missing session" }, 403);
   // }

   // const orgId = session.session.activeOrganizationId ?? "";
   const { contactId, id } = c.req.param();

   const [error, result] = await catchError<DeleteResult>(
      db
         .deleteFrom("contact")
         .where("id", "=", contactId)
         // .where("organization_id", "=", orgId)
         .where("client_id", "=", id)
         .executeTakeFirst()
   );

   if (error) {
      console.log(error);
      return c.json({ error }, 400);
   }
   const convertBigInt = (v: any): any => {
      if (typeof v === "bigint") return v.toString();
      if (Array.isArray(v)) return v.map(convertBigInt);
      if (v && typeof v === "object") {
         const out: any = {};
         for (const k of Object.keys(v)) out[k] = convertBigInt(v[k]);
         return out;
      }
      return v;
   };

   return c.json({ result: convertBigInt(result) });
});




export default clientsRoute;