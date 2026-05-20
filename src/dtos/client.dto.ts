import { z } from "zod";

const TipoClienteSchema = z.enum(["fisica", "gubernamental", "juridica"]);
const TipoIdentificacionSchema = z.enum(["CEDULA", "PASAPORTE", "RNC"]);

const ClientDTO = z.object({
   id: z.string(),
   nombre: z.string(),
   identificacion: z.string(),
   tipo_identificacion: TipoIdentificacionSchema,
   tipo_cliente: TipoClienteSchema,
   email: z.string().nullable(),
   telefono: z.string().nullable(),
   direccion: z.string().nullable(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

const ContactDTO = z.object({
   id: z.string(),
   client_id: z.string(),
   name: z.string(),
   email: z.string().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
   created_at: z.string().optional(),
   updated_at: z.string().optional(),
});

const CreateClientDTO = z.object({
   nombre: z.string().min(1),
   identificacion: z.string().min(1),
   tipo_identificacion: TipoIdentificacionSchema,
   tipo_cliente: TipoClienteSchema,
   email: z.string().nullable().optional(),
   telefono: z.string().nullable().optional(),
   direccion: z.string().nullable().optional(),
});

const UpdateClientDTO = CreateClientDTO.partial();

const CreateContactDTO = z.object({
   client_id: z.string(),
   name: z.string(),
   email: z.string().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
});

const UpdateContactDTO = z.object({
   name: z.string().optional(),
   email: z.string().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
});

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
