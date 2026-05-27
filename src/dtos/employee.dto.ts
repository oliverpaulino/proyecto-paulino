import { z } from "zod";

const TipoIdentificacionSchema = z.enum(["CEDULA", "PASAPORTE"]);
const TipoRolEmpleadoSchema = z.enum(["INGENIERO", "SECRETARIO", "CAMIONERO"]);

const EmployeeDTO = z.object({
   id: z.string().uuid(),
   user_id: z.string().nullable(),
   nombre: z.string(),
   identificacion: z.string(),
   tipo_identificacion: TipoIdentificacionSchema,
   rol: TipoRolEmpleadoSchema,
   telefono: z.string().nullable(),
   email: z.string().email().nullable(),
   salario: z.number(),
   activo: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateEmployeeDTO = z.object({
   user_id: z.string().nullable().optional(),
   nombre: z.string().min(1),
   identificacion: z.string().min(1),
   tipo_identificacion: TipoIdentificacionSchema,
   rol: TipoRolEmpleadoSchema,
   telefono: z.string().nullable().optional(),
   email: z.string().email().nullable().optional(),
   salario: z.number().min(0),
   activo: z.boolean().default(true),
});

const UpdateEmployeeDTO = CreateEmployeeDTO.partial();

//Operador
const OperatorDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   licencia: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateOperatorDTO = z.object({
   empleado_id: z.string().uuid(),
   licencia: z.string().nullable().optional(),
});

const UpdateOperatorDTO = CreateOperatorDTO.omit({ empleado_id: true }).partial();

// Amonestacion
const EmployeeWarningDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   fecha: z.coerce.date(),
   descripcion: z.string(),
   monto_descuento: z.number(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateEmployeeWarningDTO = z.object({
   empleado_id: z.string().uuid(),
   fecha: z.coerce.date(),
   descripcion: z.string(),
   monto_descuento: z.number(),
});

const UpdateEmployeeWarningDTO = CreateEmployeeWarningDTO.omit({ empleado_id: true }).partial();


export type Employee = z.infer<typeof EmployeeDTO>;
export type CreateEmployeeForm = z.infer<typeof CreateEmployeeDTO>;
export type UpdateEmployeeForm = z.infer<typeof UpdateEmployeeDTO>;
export type Operator = z.infer<typeof OperatorDTO>;
export type CreateOperatorForm = z.infer<typeof CreateOperatorDTO>;
export type UpdateOperatorForm = z.infer<typeof UpdateOperatorDTO>;
export type EmployeeWarning = z.infer<typeof EmployeeWarningDTO>;
export type CreateEmployeeWarningForm = z.infer<typeof CreateEmployeeWarningDTO>;
export type UpdateEmployeeWarningForm = z.infer<typeof UpdateEmployeeWarningDTO>;