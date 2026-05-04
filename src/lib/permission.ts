import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  project: ["create", "share", "update", "delete"],
  organization: ["create", "share", "update", "delete"],
  product: ["create", "update", "delete", "discount"],
  category: ["create", "update", "delete"],
  service: ["create", "share", "update", "delete"],
  client: ["create", "update", "delete"],
  supplier: ["create", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
  project: ["create"],
});

const admin = ac.newRole({
  project: ["create", "update"],
});

const owner = ac.newRole({
  project: ["create", "update", "delete"],
});

const myCustomRole = ac.newRole({
  project: ["create", "update", "delete"],
  organization: ["update"],
});
