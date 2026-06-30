-- Migration: 003_add_notifications
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/003_add_notifications.sql

CREATE TABLE IF NOT EXISTS notifications (
   id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id        TEXT        NOT NULL,
   title          TEXT        NOT NULL,
   message        TEXT        NOT NULL,
   type           TEXT        NOT NULL,
   reference_id   TEXT,
   reference_type TEXT,
   is_read        BOOLEAN     NOT NULL DEFAULT false,
   created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
   read_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Links a Better Auth user to an employee record
CREATE TABLE IF NOT EXISTS user_employee_link (
   id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id     TEXT        NOT NULL UNIQUE,
   empleado_id UUID        NOT NULL,
   created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_employee_link_user_id     ON user_employee_link(user_id);
CREATE INDEX IF NOT EXISTS idx_user_employee_link_empleado_id ON user_employee_link(empleado_id);
