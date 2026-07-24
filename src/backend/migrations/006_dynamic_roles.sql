-- Migration: 006_dynamic_roles
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/006_dynamic_roles.sql
--
-- Moves role -> permission bindings out of the code bundle and into the
-- database so roles can be created and edited at runtime. The resources and
-- actions themselves stay code-defined in `src/lib/permission.ts` (they are
-- compile-time types); only which actions a role grants becomes dynamic.

CREATE TABLE IF NOT EXISTS app_role (
   key         TEXT        PRIMARY KEY,
   label       TEXT        NOT NULL,
   description TEXT,
   -- { "purchase_order": ["read","list"], "notification": ["read","view"] }
   permissions JSONB       NOT NULL DEFAULT '{}'::jsonb,
   -- Built-in roles may be edited but never deleted, so a user's role always
   -- resolves to something.
   is_builtin  BOOLEAN     NOT NULL DEFAULT false,
   -- Grants the Better Auth admin plugin's elevated capabilities.
   is_admin    BOOLEAN     NOT NULL DEFAULT false,
   created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the five roles that were previously hardcoded in `permission.ts`, so
-- existing users keep exactly the access they have today. ON CONFLICT DO
-- NOTHING makes the migration safe to re-run without clobbering edits.

INSERT INTO app_role (key, label, description, is_builtin, is_admin, permissions)
VALUES
(
   'usuario', 'Usuario', 'Acceso de solo lectura a proyectos y clientes.', true, false,
   '{
      "project": ["read","list"],
      "client": ["read","list"],
      "notification": ["read","view"],
      "authentication": ["login"],
      "appointment": ["consult"]
   }'::jsonb
),
(
   'asistente', 'Asistente', 'Agenda citas, solicita tareas y recibe mercancía.', true, false,
   '{
      "project": ["read","list"],
      "inventory": ["consult","read"],
      "task": ["request","read","list"],
      "appointment": ["schedule","create","read","consult"],
      "notification": ["read","view"],
      "authentication": ["login"],
      "goods_receipt": ["create","read"]
   }'::jsonb
),
(
   'coordinador', 'Coordinador', 'Gestiona proyectos, citas y tareas.', true, false,
   '{
      "project": ["create","read","update","delete","list"],
      "appointment": ["create","read","update","delete","schedule","plan","consult","evaluate"],
      "task": ["create","read","update","delete","manage","list"],
      "inventory": ["read","consult"],
      "machinery": ["read","consult"],
      "notification": ["read","view"],
      "authentication": ["login"]
   }'::jsonb
),
(
   'contable', 'Contable', 'Gestiona facturación, cuentas, pagos y nómina.', true, false,
   '{
      "project": ["read","list"],
      "invoice": ["create","read","update","delete","generate"],
      "account_payable": ["create","read","update","delete","manage","list"],
      "account_receivable": ["create","read","update","delete","manage","list"],
      "payment": ["create","read","update","delete","manage"],
      "expense": ["create","read","update","delete","register"],
      "payroll": ["create","read","update","delete","manage","generate"],
      "purchase_order": ["read","list"],
      "quotation": ["read"],
      "notification": ["read","view"],
      "authentication": ["login"]
   }'::jsonb
),
(
   'administrador', 'Administrador', 'Acceso total al sistema.', true, true,
   '{
      "project": ["create","read","update","delete","list"],
      "organization": ["create","read","update","delete"],
      "product": ["create","read","update","delete","discount"],
      "category": ["create","read","update","delete"],
      "service": ["create","read","update","delete"],
      "client": ["create","read","update","delete","list"],
      "supplier": ["create","read","update","delete","list"],
      "inventory": ["create","read","update","delete","consult"],
      "goods_receipt": ["create","read","update","delete"],
      "machinery": ["create","read","update","delete","consult"],
      "purchase_order": ["create","read","update","delete","list"],
      "quotation": ["create","read","update","delete"],
      "invoice": ["create","read","update","delete","generate"],
      "account_payable": ["create","read","update","delete","manage","list"],
      "account_receivable": ["create","read","update","delete","manage","list"],
      "payment": ["create","read","update","delete","manage"],
      "expense": ["create","read","update","delete","register"],
      "employee": ["create","read","update","delete","list","search"],
      "payroll": ["create","read","update","delete","manage","generate"],
      "warning": ["create","read","apply"],
      "task": ["create","read","update","delete","manage","list"],
      "appointment": ["create","read","update","delete","schedule","plan","consult","evaluate"],
      "notification": ["read","view"],
      "authentication": ["login"],
      "user": ["create","list","get","update","delete","set-role","set-password","ban","impersonate"],
      "session": ["list","revoke","delete"]
   }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
