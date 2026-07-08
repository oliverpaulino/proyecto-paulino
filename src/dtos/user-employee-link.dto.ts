import { z } from "zod";

export const UserEmployeeLinkDTO = z.object({
   id: z.uuid(),
   user_id: z.uuid(),
   empleado_id: z.uuid(),
   created_at: z.coerce.date(),
});

export const CreateUserEmployeeLinkDTO = z.object({
   user_id: z.uuid({ message: "user_id debe ser un UUID válido" }),
   empleado_id: z.uuid({ message: "empleado_id debe ser un UUID válido" }),
});

export const UpdateUserEmployeeLinkDTO = CreateUserEmployeeLinkDTO.partial();

export type UserEmployeeLink = z.infer<typeof UserEmployeeLinkDTO>;
export type CreateUserEmployeeLinkForm = z.infer<typeof CreateUserEmployeeLinkDTO>;
export type UpdateUserEmployeeLinkForm = z.infer<typeof UpdateUserEmployeeLinkDTO>;