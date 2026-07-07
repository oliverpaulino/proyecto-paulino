-- Migration: 005_create_equipo_estado_historial
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/005_create_equipo_estado_historial.sql

-- Audit trail of equipo state changes. estado_* are TEXT (not the estado_equipo
-- enum) so historical values survive even if the enum is later altered.
CREATE TABLE IF NOT EXISTS equipo_estado_historial (
   id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
   equipo_id       UUID        NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
   estado_anterior TEXT,
   estado_nuevo    TEXT        NOT NULL,
   changed_by      TEXT,
   changed_by_name TEXT,
   nota            TEXT,
   created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipo_estado_historial_equipo_id
   ON equipo_estado_historial(equipo_id, created_at DESC);
