/**
 * Human-facing catalog of the access-control resources and actions defined in
 * `src/lib/permission.ts`. Drives the role editor UI and the permissions PDF.
 *
 * Keep this in sync with the `statement` object in `permission.ts`: every
 * resource/action a custom role can be granted should appear here so it is
 * selectable. Resources are organised into display groups for the editor.
 */

export type ResourceGroup =
  | "Operaciones"
  | "Inventario y Compras"
  | "Ventas y Finanzas"
  | "Personal"
  | "Administración"
  | "General";

/** Display order for the groups in the editor. */
export const GROUP_ORDER: ResourceGroup[] = [
  "Operaciones",
  "Inventario y Compras",
  "Ventas y Finanzas",
  "Personal",
  "Administración",
  "General",
];

export interface ActionEntry {
  action: string;
  label: string;
}

export interface CatalogEntry {
  /** Matches the resource key in `permission.ts`. */
  resource: string;
  /** Short human label for the resource. */
  label: string;
  group: ResourceGroup;
  actions: ActionEntry[];
}

/** Spanish labels for the generic CRUD-style actions used across resources. */
const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  read: "Ver",
  update: "Editar",
  delete: "Eliminar",
  list: "Listar",
  manage: "Gestionar",
  view: "Consultar",
  consult: "Consultar",
  search: "Buscar",
  discount: "Descuento",
  generate: "Generar",
  register: "Registrar",
  schedule: "Agendar",
  plan: "Planificar",
  evaluate: "Evaluar",
  request: "Solicitar",
  apply: "Aplicar",
  login: "Iniciar sesión",
  // Admin plugin (user/session management) actions.
  "set-role": "Asignar rol",
  ban: "Bloquear",
  impersonate: "Suplantar",
  "impersonate-admins": "Suplantar admins",
  "set-password": "Cambiar contraseña",
  get: "Ver",
  revoke: "Revocar",
};

/** Turn an action key into `{ action, label }`, falling back to the raw key. */
const a = (action: string): ActionEntry => ({
  action,
  label: ACTION_LABELS[action] ?? action,
});

const entry = (
  resource: string,
  label: string,
  group: ResourceGroup,
  actions: string[],
): CatalogEntry => ({ resource, label, group, actions: actions.map(a) });

export const PERMISSION_CATALOG: CatalogEntry[] = [
  // Operaciones
  entry("project", "Proyectos", "Operaciones", [
    "create",
    "read",
    "update",
    "delete",
    "list",
  ]),
  entry("task", "Tareas", "Operaciones", [
    "create",
    "read",
    "update",
    "delete",
    "manage",
    "request",
    "list",
  ]),
  entry("appointment", "Citas", "Operaciones", [
    "create",
    "read",
    "update",
    "delete",
    "schedule",
    "plan",
    "consult",
    "evaluate",
  ]),
  entry("service", "Servicios", "Operaciones", [
    "create",
    "read",
    "update",
    "delete",
  ]),
  entry("machinery", "Maquinaria", "Operaciones", [
    "create",
    "read",
    "update",
    "delete",
    "consult",
  ]),

  // Inventario y Compras
  entry("inventory", "Inventario", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
    "consult",
  ]),
  entry("product", "Productos", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
    "discount",
  ]),
  entry("category", "Categorías", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
  ]),
  entry("purchase_order", "Órdenes de compra", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
    "list",
  ]),
  entry("goods_receipt", "Recepción de mercancía", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
  ]),
  entry("supplier", "Proveedores", "Inventario y Compras", [
    "create",
    "read",
    "update",
    "delete",
    "list",
  ]),

  // Ventas y Finanzas
  entry("client", "Clientes", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "list",
  ]),
  entry("quotation", "Cotizaciones", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
  ]),
  entry("invoice", "Facturas", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "generate",
  ]),
  entry("account_receivable", "Cuentas por cobrar", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "manage",
    "list",
  ]),
  entry("account_payable", "Cuentas por pagar", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "manage",
    "list",
  ]),
  entry("payment", "Pagos", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "manage",
  ]),
  entry("expense", "Gastos", "Ventas y Finanzas", [
    "create",
    "read",
    "update",
    "delete",
    "register",
  ]),

  // Personal
  entry("employee", "Empleados", "Personal", [
    "create",
    "read",
    "update",
    "delete",
    "list",
    "search",
  ]),
  entry("payroll", "Nómina", "Personal", [
    "create",
    "read",
    "update",
    "delete",
    "manage",
    "generate",
  ]),
  entry("warning", "Amonestaciones", "Personal", ["create", "read", "apply"]),

  // Administración
  entry("organization", "Organización", "Administración", [
    "create",
    "read",
    "update",
    "delete",
  ]),
  entry("user", "Usuarios", "Administración", [
    "create",
    "list",
    "get",
    "update",
    "delete",
    "set-role",
    "set-password",
    "ban",
    "impersonate",
    "impersonate-admins",
  ]),
  entry("session", "Sesiones", "Administración", ["list", "revoke", "delete"]),

  // General
  entry("notification", "Notificaciones", "General", ["read", "view"]),
  entry("authentication", "Autenticación", "General", ["login"]),
];

/** Fast resource -> label lookup for badges and summaries. */
const RESOURCE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_CATALOG.map((e) => [e.resource, e.label]),
);

/** Human label for a resource key, falling back to the raw key. */
export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

/** Human label for an action key, falling back to the raw key. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
