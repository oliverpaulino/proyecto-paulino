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
   referencia: z.number(),
   codigoReferencia: z.string(),
   nombre: z.string(),
   identificacion: z.string(),
   tipo_identificacion: EmployeeSchemasDTO.TipoIdentificacionEmpleadoSchema,
   rol: EmployeeSchemasDTO.TipoRolEmpleadoSchema,
   frecuencia_pago: z.string().default("QUINCENAL"), // <-- Nuevo
   salario: z.number(),
   /** Si se le retienen TSS (AFP/SFS) e ISR en la nómina. Ver migración 016. */
   aplica_retenciones: z.boolean().default(false),
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
   frecuencia_pago: z.string().min(1, "Especifique la frecuencia de pago"), // <-- NUEVO
   // Por defecto FALSE: activarlo baja el neto del empleado, así que es una
   // decisión explícita y no un default heredado.
   aplica_retenciones: z.boolean().default(false),
   activo: z.boolean().default(true),
});

// 3. Define el esquema de la tarifa y agrégalo al Details
const EmpleadoTarifaDTO = z.object({
   id: z.string().uuid(),
   empleado_id: z.string().uuid(),
   categoria_equipo_tarifa_id: z.string().uuid(),
   tarifa_nombre: z.string(),
   categoria_equipo_id: z.string().uuid(),
   categoria_nombre: z.string(),
   monto_pago: z.coerce.number().min(0),
});

const TarifaBulkInputDTO = z.object({
   categoria_equipo_tarifa_id: z.string().uuid("El ID de la tarifa debe ser un UUID válido"),
   monto_pago: z.coerce.number().min(0, "El monto no puede ser negativo"),
});

// 2. Esquema para validar el payload completo que se envía desde el formulario
const SaveTarifasBulkDTO = z.object({
   tarifas: z.array(TarifaBulkInputDTO).min(1, "Debe enviar al menos una tarifa para guardar"),
});

// 3. Exportar los tipos para usarlos en el Store (Zustand) y en el Formulario
export type TarifaBulkInputForm = z.infer<typeof TarifaBulkInputDTO>;
export type SaveTarifasBulkForm = z.infer<typeof SaveTarifasBulkDTO>;



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
   tarifas: z.array(EmpleadoTarifaDTO).default([]),
});

const OperadorAsignableDTO = z.object({
   id: z.string(), // operador.id (id del perfil de operador, no del empleado)
   nombre: z.string(),
   identificacion: z.string(),
   referencia: z.number().optional(),
   licencia: z.string().nullable(),
   fecha_vencimiento: z.coerce.date().nullable(),
   // Si es false, el operador no debe poder asignarse a nada nuevo.
   activo: z.boolean().optional().default(true),
});

export type Employee = z.infer<typeof EmployeeDTO>;
export type EmpleadoTarifa = z.infer<typeof EmpleadoTarifaDTO>;
export type CreateEmployeeForm = z.infer<typeof CreateEmployeeDTO>;
export type UpdateEmployeeForm = z.infer<typeof UpdateEmployeeDTO>;
export type ContactEmployee = z.infer<typeof ContactEmployeeDTO>;
export type CreateContactEmployeeForm = z.infer<typeof CreateContactEmployeeDTO>;
export type UpdateContactEmployeeForm = z.infer<typeof UpdateContactEmployeeDTO>;
export type Operator = z.infer<typeof OperatorDTO>;
export type CreateOperatorForm = z.infer<typeof CreateOperatorDTO>;
export type UpdateOperatorForm = z.infer<typeof UpdateOperatorDTO>;
export type EmployeeDetails = z.infer<typeof EmployeeDetailsDTO>;
export type OperadorAsignable = z.infer<typeof OperadorAsignableDTO>;