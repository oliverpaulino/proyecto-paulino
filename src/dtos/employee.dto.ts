import { z } from "zod";
import { GeneralSchemasDTO, EmployeeSchemasDTO } from "./schema.dto";

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

const CreateEmployeeDTO = z.object({
   nombre: z.string().min(1),
   identificacion: z.string().min(1),
   tipo_identificacion: EmployeeSchemasDTO.TipoIdentificacionEmpleadoSchema,
   rol: EmployeeSchemasDTO.TipoRolEmpleadoSchema,
   salario: z.number().min(0),
   activo: z.boolean().default(true),
}).superRefine((data, ctx) => {

   if (data.tipo_identificacion === "CEDULA") {
      const result = GeneralSchemasDTO.CedulaSchema.safeParse(data.identificacion);

      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({
               ...issue,
               path: ["identificacion"],
               params: { internalCode: "ERR_INVALID_CEDULA" }
            });
         });
      }
   }

   if (data.tipo_identificacion === "PASAPORTE") {
      const result = GeneralSchemasDTO.PasaporteSchema.safeParse(data.identificacion);

      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({
               ...issue,
               path: ["identificacion"],
               params: { internalCode: "ERR_INVALID_PASSPORT" }
            });
         });
      }
   }
});

const UpdateEmployeeDTO = CreateEmployeeDTO.partial();

// Contacto empleado
const ContactEmployeeDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   tipo_contacto: GeneralSchemasDTO.TipoContactoSchema,
   contacto: z.string(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateContactEmployeeDTO = z.object({
   empleado_id: z.string().uuid(),
   tipo_contacto: GeneralSchemasDTO.TipoContactoSchema,
   contacto: z.string().min(1, "El contacto no puede estar vacío"),
}).superRefine((data, ctx) => {
   
   if (data.tipo_contacto === "TELEFONO") {
      const result = GeneralSchemasDTO.TelefonoSchema.safeParse(data.contacto);

      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({
               ...issue,
               path: ["contacto"],
               params: { internalCode: "ERR_INVALID_PHONE" }
            });
         });
      }
   }

   if (data.tipo_contacto === "EMAIL") {
      const result = GeneralSchemasDTO.EmailSchema.safeParse(data.contacto);

      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({
               ...issue,
               path: ["contacto"],
               params: { internalCode: "ERR_INVALID_EMAIL" }
            });
         });
      }
   }
});

const UpdateContactEmployeeDTO = CreateContactEmployeeDTO.omit({ empleado_id: true }).partial();

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