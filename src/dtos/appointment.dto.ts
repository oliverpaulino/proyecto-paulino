import { z } from "zod";

export const EstadoCita = {
   EN_REVISION: "En revisión", 
   PENDIENTE: "Pendiente", 
   REALIZADA: "Realizada",
   CANCELADA: "Cancelada",
} as const;

const EstadoCitaSchema = z.enum(
  Object.keys(EstadoCita) as [
    keyof typeof EstadoCita,
    ...(keyof typeof EstadoCita)[]
  ]
);

export const AppointmentDTO = z.object({
   id: z.uuid(),
   cliente_id: z.uuid().nullable(),
   employee_id: z.uuid().nullable(),
   fecha: z.coerce.date(),
   motivo: z.string().nullable(),
   estado: EstadoCitaSchema,
   notas: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateAppointmentBaseDTO = z.object({
   cliente_id: z.uuid().nullable().optional(),
   employee_id: z.uuid().nullable().optional(),
   fecha: z.coerce.date(),
   motivo: z.string().nullable().optional(),
   estado: EstadoCitaSchema.default("PENDIENTE"),
   notas: z.string().nullable().optional(),
});

const validateAppointmentTime = (data: any, ctx: z.RefinementCtx) => {
   if (!data.fecha) return;
   
   const margenDeGracia = new Date(Date.now() - 60 * 60 * 1000);

   if (new Date(data.fecha) < margenDeGracia) {
      ctx.addIssue({
         code: z.ZodIssueCode.custom,
         message: "No puedes agendar una cita con más de 1 hora en el pasado",
         path: ["fecha"],
      });
   }
};

export const CreateAppointmentSchema = CreateAppointmentBaseDTO.superRefine(validateAppointmentTime);
export const UpdateAppointmentSchema = CreateAppointmentBaseDTO.partial();

export type EstadoCita = z.infer<typeof EstadoCitaSchema>;
export type Appointment = z.infer<typeof AppointmentDTO>;

export interface AppointmentUI extends Appointment {
   cliente_nombre: string | null;
   employee_nombre: string | null;
}

export type CreateAppointmentForm = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentForm = z.infer<typeof UpdateAppointmentSchema>;