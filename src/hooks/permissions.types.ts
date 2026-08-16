import type { ac } from "@/lib/permission";

export type Resource =
   | "project"
   | "product"
   | "sale"
   | "category"
   | "service"
   | "user"
   | "supplier"
   | "organization"
   | "bu"
   | "finances"
   | "invoice"
   | "ac"
   | "features"
   | "users"
   | "taxOrgProfiles"
   | "material_request"
   | "payment_request"
   // Direct resources for pages whose domain has no aggregate mapping above.
   | "client"
   | "machinery"
   | "task"
   | "appointment"
   | "payroll"
   | "account_payable"
   | "account_receivable"
   | "payment"
   | "expense"
   | "warning";

export type Action =
   | "create"
   | "read"
   | "update"
   | "delete"
   | "share"
   | "discount"
   | "margin"
   | "approve"
   | "manage"
   | "view"
   | "add"
   | "readAll"
   | "readOwn";

export type PermissionStatements = typeof ac.statements;