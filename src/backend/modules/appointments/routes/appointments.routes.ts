import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyAppointmentRepository } from "../infraestructure/appointments.infraestructure";
import { AppointmentService } from "../service/appointments.service";
import { CreateAppointmentSchema, UpdateAppointmentSchema, EstadoCita as ESTADOS_CITA } from "@/dtos/appointment.dto";
import { EstadoCita } from "../domain/appointments.domain";

const appointmentsRoute = new Hono();
const repo = new KyselyAppointmentRepository(db);
const service = new AppointmentService(repo);

// GET /api/appointments
appointmentsRoute.get("/", async (c) => {
   const start = c.req.query("start");
   const end = c.req.query("end");
   const endWithTime = end? `${end}T23:59:59.999` : undefined;

   try {
      if (start && endWithTime) {
         const appointments = await service.getByRangeUI(new Date(start), new Date(endWithTime));
         return c.json(appointments);
      }

      if (start) {
         const appointments = await service.getByRangeUI(new Date(start), null);
         return c.json(appointments);
      }

      if (endWithTime) {
         const appointments = await service.getByRangeUI(null, new Date(endWithTime));
         return c.json(appointments);
      }

      const appointments = await service.getAllUI();
      return c.json(appointments);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al obtener citas" }, 400);
   }
});

// GET /api/appointments/:id
appointmentsRoute.get("/:id", async (c) => {
   const appointment = await service.getByIdUI(c.req.param("id"));
   if (!appointment) return c.json({ error: "Cita no encontrada" }, 404);
   return c.json(appointment);
});

// GET /api/appointments/client/:clientId
appointmentsRoute.get("/client/:clientId", async (c) => {
   const appointments = await service.getByClientIdUI(c.req.param("clientId"));
   return c.json(appointments);
});

// GET /api/appointments/employee/:employeeId
appointmentsRoute.get("/employee/:employeeId", async (c) => {
   const appointments = await service.getByEmployeeIdUI(c.req.param("employeeId"));
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