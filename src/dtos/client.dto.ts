import { z } from "zod";

const ClientDTO = z.object({
   id: z.uuid(),
   code: z.string(),
   type: z.enum(["individual", "company"]),
   name: z.string(),
   rnc_cedula: z.string(),
   email: z.email().optional(),
   phone: z.string().optional(),
   address: z.string().optional(),
   payment_terms: z.number().optional(),
   default_comprobante: z.string().optional(),
});

const ContactDTO = z.object({
   id: z.uuid(),
   client_id: z.uuid(),
   name: z.string(),
   email: z.email().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
   created_at: z.string().optional(),
   updated_at: z.string().optional(),
});

const CreateClientDTO = z.object({
   name: z.string(),
   email: z.email().optional(),
   phone: z.string().optional(),
   address: z.string().optional(),
   rnc_cedula: z.string().optional(),
   customer_profile_id: z.uuid().optional(),
   default_comprobante: z.string().optional(),
   credit_limit: z.number().optional(),
   payment_terms: z.number().optional(),
});

const CreateContactDTO = z.object({
   client_id: z.uuid(),
   name: z.string(),
   email: z.email().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
});


const UpdateClientDTO = z.object({
   name: z.string().optional(),
   email: z.email().optional(),
   phone: z.string().optional(),
   address: z.string().optional(),
   rnc_cedula: z.string().optional(),
});

const UpdateContactDTO = z.object({
   name: z.string().optional(),
   email: z.email().optional(),
   phone: z.string().optional(),
   job_title: z.string().optional(),
});

// Client Analytics DTOs
const ClientLifetimeValueDTO = z.object({
   total_sales_value: z.number(),
   total_projects_value: z.number(),
   total_lifetime_value: z.number(),
   total_paid_amount: z.number(),
   outstanding_balance: z.number(),
   total_orders: z.number(),
   total_projects: z.number(),
   first_purchase_date: z.date().nullable(),
   last_purchase_date: z.date().nullable(),
   average_order_value: z.number(),
   customer_tenure_days: z.number(),
});

const ClientSalesSummaryDTO = z.object({
   id: z.uuid(),
   invoice_number: z.string().optional(),
   total: z.number(),
   status: z.enum(["pending", "approved", "completed", "canceled"]),
   payment_status: z.string().optional(),
   paid_amount: z.number().optional(),
   created_at: z.string(),
});
const ClientAccountSalesDTO = z.object({
   id: z.uuid(),
   invoice_number: z.string(),
   total: z.number(),
   status: z.string(),
   payment_status: z.string(),
   paid_amount: z.string(),
   currency: z.string(),
   due_date: z.string(),
   note_type: z.string().nullable().optional(),
   invoice_type: z.string().optional(),
});

const ClientProjectSummaryDTO = z.object({
   id: z.uuid(),
   name: z.string(),
   project_type: z.enum(["product", "service", "mixed"]),
   status: z.enum(["draft", "active", "on_hold", "completed", "cancelled"]),
   total_revenue: z.number(),
   actual_cost: z.number(),
   profit_margin: z.number(),
   created_at: z.date().optional(),
});

const ClientDetailsDTO = z.object({
   client: ClientDTO,
   lifetime_value: ClientLifetimeValueDTO,
   recent_sales: z.array(ClientSalesSummaryDTO),
   recent_projects: z.array(ClientProjectSummaryDTO),
   sales_by_month: z.array(
      z.object({
         month: z.string(),
         total_sales: z.number(),
         order_count: z.number(),
      })
   ),
   projects_by_status: z.record(z.string(), z.number()),
});

export type Client = z.infer<typeof ClientDTO>;
export type Contact = z.infer<typeof ContactDTO>;
export type CreateContactForm = z.infer<typeof CreateContactDTO>;
export type UpdateContactForm = z.infer<typeof UpdateContactDTO>;
export type ClientForm = z.infer<typeof CreateClientDTO>;
export type UpdateClientForm = z.infer<typeof UpdateClientDTO>;
export type ClientLifetimeValue = z.infer<typeof ClientLifetimeValueDTO>;
export type ClientSalesSummary = z.infer<typeof ClientSalesSummaryDTO>;
export type ClientProjectSummary = z.infer<typeof ClientProjectSummaryDTO>;
export type ClientDetails = z.infer<typeof ClientDetailsDTO>;
export type ClientAccountSale = z.infer<typeof ClientAccountSalesDTO>;
