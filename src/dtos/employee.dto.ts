import { z } from "zod";

const TipoIdentificacionSchema = z.enum(["CEDULA", "RNC", "PASAPORTE"]);
const TipoRolEmpleadoSchema = z.enum(["OPERADOR", "INGENIERO", "MECANICO", "CONTABLE", "MENSAJERO"]);
const TipoContactoEmpleadoSchema = z.enum(["TELEFONO", "EMAIL"]);

// Empleado
const EmployeeDTO = z.object({
   id: z.string().uuid(),
   nombre: z.string(),
   identificacion: z.string(),
   tipo_identificacion: TipoIdentificacionSchema,
   rol: TipoRolEmpleadoSchema,
   salario: z.number(),
   activo: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateEmployeeDTO = z.object({
   nombre: z.string().min(1),
   identificacion: z.string().min(1),
   tipo_identificacion: TipoIdentificacionSchema,
   rol: TipoRolEmpleadoSchema,
   salario: z.number().min(0),
   activo: z.boolean().default(true),
});

const UpdateEmployeeDTO = CreateEmployeeDTO.partial();

// Contacto empleado
const ContactEmployeeDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   tipo_contacto: TipoContactoEmpleadoSchema,
   contacto: z.string(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateContactEmployeeDTO = z.object({
   empleado_id: z.string().uuid(),
   tipo_contacto: TipoContactoEmpleadoSchema,
   contacto: z.string().min(1),
});

const UpdateContactEmployeeDTO = CreateContactEmployeeDTO.omit({ empleado_id: true }).partial();

// Operador
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

// Amonestación
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
   descripcion: z.string().min(1),
   monto_descuento: z.number().min(0),
});

const UpdateEmployeeWarningDTO = CreateEmployeeWarningDTO.omit({ empleado_id: true }).partial();

const EmployeeDetailsDTO = z.object({
   empleado: EmployeeDTO,
   contactos: z.array(ContactEmployeeDTO).default([]),
   amonestaciones: z.array(EmployeeWarningDTO).default([]),
   operador: OperatorDTO.nullable().default(null),
});

export type Employee = z.infer<typeof EmployeeDTO>;
export type CreateEmployeeForm = z.infer<typeof CreateEmployeeDTO>;
export type UpdateEmployeeForm = z.infer<typeof UpdateEmployeeDTO>;
export type ContactEmployee = z.infer<typeof ContactEmployeeDTO>;
export type CreateContactEmployeeForm = z.infer<typeof CreateContactEmployeeDTO>;
export type UpdateContactEmployeeForm = z.infer<typeof UpdateContactEmployeeDTO>;
export type Operator = z.infer<typeof OperatorDTO>;
export type CreateOperatorForm = z.infer<typeof CreateOperatorDTO>;
export type UpdateOperatorForm = z.infer<typeof UpdateOperatorDTO>;
export type EmployeeWarning = z.infer<typeof EmployeeWarningDTO>;
export type CreateEmployeeWarningForm = z.infer<typeof CreateEmployeeWarningDTO>;
export type UpdateEmployeeWarningForm = z.infer<typeof UpdateEmployeeWarningDTO>;
export type EmployeeDetails = z.infer<typeof EmployeeDetailsDTO>;