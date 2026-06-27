import { z } from "zod";

export const ESTADOS_CITA = ["EN_REVISION", "PENDIENTE", "REALIZADA", "CANCELADA"] as const;

export const EstadoCitaSchema = z.enum(ESTADOS_CITA);

const AppointmentDTO = z.object({
   id: z.uuid(),
   cliente_id: z.uuid(),
   user_id: z.uuid().nullable(),
   fecha: z.coerce.date(),
   motivo: z.string().nullable(),
   estado: EstadoCitaSchema,
   notas: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateAppointmentBaseDTO = z.object({
   cliente_id: z.uuid("El cliente_id debe ser un UUID válido"),
   user_id: z.uuid().nullable().optional(),
   fecha: z.coerce.date(),
   motivo: z.string().nullable().optional(),
   estado: EstadoCitaSchema.default("PENDIENTE"),
   notas: z.string().nullable().optional(),
});

const validateAppointmentTime = (data: any, ctx: z.RefinementCtx) => {
   if (!data.fecha) return;
   
   // Validación de ejemplo: no permitir agendar citas en el pasado
   if (new Date(data.fecha) < new Date()) {
      ctx.addIssue({
         code: z.ZodIssueCode.custom,
         message: "No se puede agendar una cita en una fecha pasada",
         path: ["fecha"],
      });
   }
};

export const CreateAppointmentSchema = CreateAppointmentBaseDTO.superRefine(validateAppointmentTime);
export const UpdateAppointmentSchema = CreateAppointmentBaseDTO.partial();

export type AppointmentForm = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentForm = z.infer<typeof UpdateAppointmentSchema>;