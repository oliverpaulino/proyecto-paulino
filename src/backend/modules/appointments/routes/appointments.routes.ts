import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyAppointmentRepository } from "../infraestructure/appointments.infraestructure";
import { AppointmentService } from "../service/appointments.service";
import { CreateAppointmentSchema, UpdateAppointmentSchema, EstadoCita as ESTADOS_CITA } from "@/dtos/appointment.dto";
import { EstadoCita } from "../domain/appointments.domain";
import { auth } from "@/lib/auth";

const appointmentsRoute = new Hono();
const repo = new KyselyAppointmentRepository(db);
const service = new AppointmentService(repo);

// GET /api/appointments
appointmentsRoute.get("/", async (c) => {
   const mineParam = c.req.query("mine");
   const startParam = c.req.query("start");
   const endParam = c.req.query("end");
   const endWithTimeParam = endParam ? `${endParam}T23:59:59.999` : undefined;
   const stateParam = c.req.query("state");

   let userId = null;
   let mine = false;
   let start = null;
   let end = null;
   let state = null;

   if (mineParam === "true") {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      userId = session?.user?.id || null;
      mine = true;
   }

   if (startParam) {
      start = new Date(startParam);
   }

   if (endWithTimeParam) {
      end = new Date(endWithTimeParam);
   }

   if (stateParam) {
      state = stateParam as EstadoCita;
   }

   try {
      const appointments = await service.getAll(start, end, state, mine, userId);
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

// GET /api/appointments/employee/:employeeId
appointmentsRoute.get("/employee/:employeeId", async (c) => {
   const appointments = await service.getByEmployeeId(c.req.param("employeeId"));
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