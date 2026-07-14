import { z } from "zod";
import { GeneralSchemasDTO } from "./schema.dto";

export const TipoCliente = {
  FISICA: "Persona Física",
  JURIDICA: "Persona Jurídica",
  GUBERNAMENTAL: "Entidad Gubernamental",
} as const;

const TipoClienteSchema = z.enum(
  Object.keys(TipoCliente) as [
    keyof typeof TipoCliente,
    ...(keyof typeof TipoCliente)[]
  ]
);

export const ClientSchemasDTO = {
  TipoClienteSchema,
};

const ClientDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   referencia: z.number(),
   codigoReferencia: z.string(),
   identificacion: z.string(),
   tipo_identificacion: GeneralSchemasDTO.TipoIdentificacionSchema,
   tipo_cliente: TipoClienteSchema,
   email: GeneralSchemasDTO.OptionalEmailSchema,
   telefono: GeneralSchemasDTO.OptionalTelefonoSchema,
   direccion: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateClientBaseDTO = z.object({
   nombre: z.string().min(1, "El nombre es obligatorio"),
   identificacion: z.string().min(1, "La identificación es obligatoria"),
   tipo_identificacion: GeneralSchemasDTO.TipoIdentificacionSchema,
   tipo_cliente: TipoClienteSchema,
   email: GeneralSchemasDTO.OptionalEmailSchema,
   telefono: GeneralSchemasDTO.OptionalTelefonoSchema,
   direccion: z.string().nullable().optional(),
});

const validateClientDoc = (data: any, ctx: z.RefinementCtx) => {
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

   if (data.tipo_identificacion === "RNC") {
      const result = GeneralSchemasDTO.RncSchema.safeParse(data.identificacion);
      if (!result.success) {
         result.error.issues.forEach((issue) => {
            ctx.addIssue({ ...issue, path: ["identificacion"], params: { internalCode: "ERR_INVALID_RNC" } });
         });
      }
   }
};

const CreateClientDTO = CreateClientBaseDTO.superRefine(validateClientDoc);

const UpdateClientDTO = CreateClientBaseDTO.partial().superRefine(validateClientDoc);


const ContactDTO = z.object({
   id: z.string(),
   client_id: z.string(),
   name: z.string(),
   email: GeneralSchemasDTO.OptionalEmailSchema,
   phone: GeneralSchemasDTO.OptionalTelefonoSchema,
   job_title: z.string().optional(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const CreateContactDTO = z.object({
   client_id: z.string(),
   name: z.string().min(1, "El nombre es obligatorio"),
   email: GeneralSchemasDTO.OptionalEmailSchema,
   phone: GeneralSchemasDTO.OptionalTelefonoSchema,
   job_title: z.string().optional(),
});

const UpdateContactDTO = CreateContactDTO.omit({ client_id: true }).partial();

const ClientSalesSummaryDTO = z.object({
   id: z.string(),
   invoice_number: z.string().optional(),
   total: z.number(),
   status: z.enum(["pending", "approved", "completed", "canceled"]),
   payment_status: z.string().optional(),
   paid_amount: z.number().optional(),
   created_at: z.string(),
});

const ClientProjectSummaryDTO = z.object({
   id: z.string(),
   name: z.string(),
   project_type: z.enum(["product", "service", "mixed"]),
   status: z.enum(["draft", "active", "on_hold", "completed", "cancelled"]),
   total_revenue: z.number(),
   actual_cost: z.number(),
   profit_margin: z.number(),
   created_at: z.coerce.date().optional(),
});

const ClientDetailsDTO = z.object({
   client: ClientDTO,
   recent_sales: z.array(ClientSalesSummaryDTO).optional(),
   recent_projects: z.array(ClientProjectSummaryDTO).optional(),
});

export type Client = z.infer<typeof ClientDTO>;
export type Contact = z.infer<typeof ContactDTO>;
export type ClientForm = z.infer<typeof CreateClientDTO>;
export type UpdateClientForm = z.infer<typeof UpdateClientDTO>;
export type CreateContactForm = z.infer<typeof CreateContactDTO>;
export type UpdateContactForm = z.infer<typeof UpdateContactDTO>;
export type ClientSalesSummary = z.infer<typeof ClientSalesSummaryDTO>;
export type ClientProjectSummary = z.infer<typeof ClientProjectSummaryDTO>;
export type ClientDetails = z.infer<typeof ClientDetailsDTO>;