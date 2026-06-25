import { z } from "zod";
import { GeneralSchemasDTO } from "./schema.dto";

// SCHEMAS DE EMPLEADOS
export const TipoIdentificacionEmpleado = {
  CEDULA: "Cédula",
  PASAPORTE: "Pasaporte",
} as const;

export const TipoRolEmpleado = {
  OPERADOR: "Operador",
  INGENIERO: "Ingeniero",
  MECANICO: "Mecánico",
  CONTABLE: "Contable",
  MENSAJERO: "Mensajero",
} as const;

const TipoIdentificacionEmpleadoSchema = z.enum(
  Object.keys(TipoIdentificacionEmpleado) as [
    keyof typeof TipoIdentificacionEmpleado,
    ...(keyof typeof TipoIdentificacionEmpleado)[]
  ]
);

const TipoRolEmpleadoSchema = z.enum(
  Object.keys(TipoRolEmpleado) as [
    keyof typeof TipoRolEmpleado,
    ...(keyof typeof TipoRolEmpleado)[]
  ]
);

export const EmployeeSchemasDTO = {
  TipoIdentificacionEmpleadoSchema,
  TipoRolEmpleadoSchema,
};

// Empleado
const EmployeeDTO = z.object({
   id: z.uuid(),
   nombre: z.string(),
   identificacion: z.string(),
   tipo_identificacion: EmployeeSchemasDTO.TipoIdentificacionEmpleadoSchema,
   rol: EmployeeSchemasDTO.TipoRolEmpleadoSchema,
   salario: z.number(),
   activo: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateEmployeeBaseDTO = z.object({
   nombre: z.string().min(1),
   identificacion: z.string().min(1),
   tipo_identificacion: EmployeeSchemasDTO.TipoIdentificacionEmpleadoSchema,
   rol: EmployeeSchemasDTO.TipoRolEmpleadoSchema,
   salario: z.number().min(0),
   activo: z.boolean().default(true),
});

const validateEmployeeDoc = (data: any, ctx: z.RefinementCtx) => {
   if (!data.tipo_identificacion || !data.identificacion) return;

   if (data.tipo_identificacion === "CEDULA") {
      const result = GeneralSchemasDTO.CedulaSchema.safeParse(data.identificacion);
      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({ ...issue, path: ["identificacion"], params: { internalCode: "ERR_INVALID_CEDULA" } });
         });
      }
   }

   if (data.tipo_identificacion === "PASAPORTE") {
      const result = GeneralSchemasDTO.PasaporteSchema.safeParse(data.identificacion);
      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({ ...issue, path: ["identificacion"], params: { internalCode: "ERR_INVALID_PASSPORT" } });
         });
      }
   }
};

const CreateEmployeeDTO = CreateEmployeeBaseDTO.superRefine(validateEmployeeDoc);
const UpdateEmployeeDTO = CreateEmployeeBaseDTO.partial().superRefine(validateEmployeeDoc);

const ContactEmployeeDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   name: z.string(),
   email: GeneralSchemasDTO.OptionalEmailSchema,
   phone: GeneralSchemasDTO.OptionalTelefonoSchema,
   job_title: z.string().nullable().optional(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateContactEmployeeDTO = z.object({
   empleado_id: z.string().uuid(),
   name: z.string().min(1, "El nombre es obligatorio"),
   email: GeneralSchemasDTO.OptionalEmailSchema,
   phone: GeneralSchemasDTO.OptionalTelefonoSchema,
   job_title: z.string().optional(),
});

const UpdateContactEmployeeDTO = z.object({
   name: z.string().min(1).optional(),
   email: GeneralSchemasDTO.OptionalEmailSchema,
   phone: GeneralSchemasDTO.OptionalTelefonoSchema,
   job_title: z.string().optional(),
});


// Operador
const OperatorDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   licencia: z.string().nullable(),
   fecha_vencimiento: z.coerce.date().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateOperatorDTO = z.object({
   empleado_id: z.string().uuid(),
   licencia: z.string().nullable().optional(),
   fecha_vencimiento: z.coerce.date().nullable().optional(),
});

const UpdateOperatorDTO = CreateOperatorDTO.omit({ empleado_id: true }).partial();

const EmployeeDetailsDTO = z.object({
   empleado: EmployeeDTO,
   contactos: z.array(ContactEmployeeDTO).default([]),
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
export type EmployeeDetails = z.infer<typeof EmployeeDetailsDTO>;