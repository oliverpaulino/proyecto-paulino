import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyAppointmentRepository } from "../infraestructure/appointments.infraestructure";
import { AppointmentService } from "../service/appointments.service";
import { CreateAppointmentSchema, UpdateAppointmentSchema, ESTADOS_CITA } from "@/dtos/appointments.dto";
import { EstadoCita } from "../domain/appointments.domain";

const appointmentsRoute = new Hono();
const repo = new KyselyAppointmentRepository(db);
const service = new AppointmentService(repo);

// GET /api/appointments
appointmentsRoute.get("/", async (c) => {
   const start = c.req.query("start");
   const end = c.req.query("end");
   const state = c.req.query("state");

   try {
      if (start && end) {
         const appointments = await service.getByRange(new Date(start), new Date(end));
         return c.json(appointments);
      }

      if (state && ESTADOS_CITA.includes(state as EstadoCita)) {
         const appointments = await service.getByState(state as EstadoCita);
         return c.json(appointments);
      }

      const appointments = await service.getAll();
      return c.json(appointments);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener citas" }, 400);
   }
});

// GET /api/appointments/:id
appointmentsRoute.get("/:id", async (c) => {
   const appointment = await service.getById(c.req.param("id"));
   if (!appointment) return c.json({ error: "Cita no encontrada" }, 404);
   return c.json(appointment);
});

// GET /api/appointments/client/:clientId
appointmentsRoute.get("/client/:clientId", async (c) => {
   const appointments = await service.getByClientId(c.req.param("clientId"));
   return c.json(appointments);
});

// GET /api/appointments/user/:userId
appointmentsRoute.get("/user/:userId", async (c) => {
   const appointments = await service.getByUserId(c.req.param("userId"));
   return c.json(appointments);
});

// POST /api/appointments
appointmentsRoute.post("/", async (c) => {
   const body = await c.req.json();
   const parseResult = CreateAppointmentSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const appointment = await service.create(parseResult.data);
      return c.json(appointment, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al crear cita" }, 400);
   }
});

// PATCH /api/appointments/:id
appointmentsRoute.patch("/:id", async (c) => {
   const id = c.req.param("id");
   const body = await c.req.json();
   const parseResult = UpdateAppointmentSchema.safeParse(body);

   if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
   }

   try {
      const appointment = await service.update(id, parseResult.data);
      if (!appointment) return c.json({ error: "Cita no encontrada" }, 404);
      return c.json(appointment);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al actualizar cita" }, 400);
   }
});

// DELETE /api/appointments/:id
appointmentsRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Cita no encontrada" }, 404);
   return c.json({ success: true });
});

export default appointmentsRoute;