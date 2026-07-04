import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";

// Define todas las acciones disponibles por recurso
const statement = {
  ...defaultStatements,
  project: ["create", "read", "update", "delete", "list"],

  organization: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete", "discount"],
  category: ["create", "read", "update", "delete"],
  service: ["create", "read", "update", "delete"],

  client: ["create", "read", "update", "delete", "list"],
  supplier: ["create", "read", "update", "delete", "list"],

  inventory: ["create", "read", "update", "delete", "consult"],
  goods_receipt: ["create", "read", "update", "delete"],
  machinery: ["create", "read", "update", "delete", "consult"],

  purchase_order: ["create", "read", "update", "delete", "list"],

  quotation: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete", "generate"],

  account_payable: ["create", "read", "update", "delete", "manage", "list"],
  account_receivable: ["create", "read", "update", "delete", "manage", "list"],
  payment: ["create", "read", "update", "delete", "manage"],
  expense: ["create", "read", "update", "delete", "register"],

  employee: ["create", "read", "update", "delete", "list", "search"],
  payroll: ["create", "read", "update", "delete", "manage", "generate"],
  warning: ["create", "read", "apply"],

  task: ["create", "read", "update", "delete", "manage", "request", "list"],
  appointment: ["create", "read", "update", "delete", "schedule", "plan", "consult", "evaluate"],

  notification: ["read", "view"],
  authentication: ["login"],
} as const;

const ac = createAccessControl(statement);

const usuario = ac.newRole({
  project: ["read", "list"],
  client: ["read", "list"],
  notification: ["read", "view"],
  authentication: ["login"],
  appointment: ["consult"],
});

const asistente = ac.newRole({
  project: ["read", "list"],

  inventory: ["consult", "read"],

  task: ["request", "read", "list"],

  appointment: ["schedule", "create", "read", "consult"],

  notification: ["read", "view"],
  authentication: ["login"],

  goods_receipt: ["create", "read"],
});

const coordinador = ac.newRole({
  project: ["create", "read", "update", "delete", "list"],

  appointment: ["create", "read", "update", "delete", "schedule", "plan", "consult", "evaluate"],

  task: ["create", "read", "update", "delete", "manage", "list"],

  inventory: ["read", "consult"],
  machinery: ["read", "consult"],

  notification: ["read", "view"],
  authentication: ["login"],


});

const contable = ac.newRole({
  project: ["read", "list"],

  invoice: ["create", "read", "update", "delete", "generate"],
  account_payable: ["create", "read", "update", "delete", "manage", "list"],
  account_receivable: ["create", "read", "update", "delete", "manage", "list"],
  payment: ["create", "read", "update", "delete", "manage"],
  expense: ["create", "read", "update", "delete", "register"],

  payroll: ["create", "read", "update", "delete", "manage", "generate"],

  purchase_order: ["read", "list"],
  quotation: ["read"],

  notification: ["read", "view"],
  authentication: ["login"],
});

const administrador = ac.newRole({
  ...adminAc.statements,
  project: ["create", "read", "update", "delete", "list"],
  organization: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete", "discount"],
  category: ["create", "read", "update", "delete"],
  service: ["create", "read", "update", "delete"],
  client: ["create", "read", "update", "delete", "list"],
  supplier: ["create", "read", "update", "delete", "list"],
  inventory: ["create", "read", "update", "delete", "consult"],
  goods_receipt: ["create", "read", "update", "delete"],
  machinery: ["create", "read", "update", "delete", "consult"],
  purchase_order: ["create", "read", "update", "delete", "list"],
  quotation: ["create", "read", "update", "delete"],
  invoice: ["create", "read", "update", "delete", "generate"],
  account_payable: ["create", "read", "update", "delete", "manage", "list"],
  account_receivable: ["create", "read", "update", "delete", "manage", "list"],
  payment: ["create", "read", "update", "delete", "manage"],
  expense: ["create", "read", "update", "delete", "register"],
  employee: ["create", "read", "update", "delete", "list", "search"],
  payroll: ["create", "read", "update", "delete", "manage", "generate"],
  warning: ["create", "read", "apply"],
  task: ["create", "read", "update", "delete", "manage", "list"],
  appointment: ["create", "read", "update", "delete", "schedule", "plan", "consult", "evaluate"],
  notification: ["read", "view"],
  authentication: ["login"],
});

const roles = {
  usuario,
  asistente,
  coordinador,
  contable,
  administrador,
};

export { ac, roles };