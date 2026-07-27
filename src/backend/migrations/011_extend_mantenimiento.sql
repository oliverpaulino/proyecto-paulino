-- Migration: 011_extend_mantenimiento
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/011_extend_mantenimiento.sql
--
-- La tabla `mantenimiento` YA EXISTÍA con una forma mínima:
--   id, equipo_id, fecha, descripcion, costo, created_at, updated_at
-- (creada fuera de este directorio de migraciones, sin archivo que la declare).
--
-- Esta migración la EXTIENDE en vez de recrearla, para no perder la tabla ni su
-- FK a equipo. Estaba vacía al momento de escribir esto, así que el renombrado
-- de `fecha` -> `fecha_inicio` no mueve datos; aun así se hace condicional para
-- que correrla dos veces sea seguro.
--
-- Modelo nuevo: una fila está ABIERTA mientras `fecha_fin` sea null — el estado
-- en que queda el equipo al pasar a EN_MANTENIMIENTO — y se cierra al
-- devolverlo a ACTIVO. `gasto_id` enlaza el costo con el módulo de gastos.

-- `fecha` pasa a llamarse `fecha_inicio` ahora que existe una fecha de cierre.
ALTER TABLE mantenimiento RENAME COLUMN fecha TO fecha_inicio;

ALTER TABLE mantenimiento
   ALTER COLUMN fecha_inicio SET DEFAULT CURRENT_DATE;

-- `costo` era NOT NULL DEFAULT 0, pero un mantenimiento recién abierto todavía
-- no tiene costo conocido: 0 mentiría. Se permite NULL = "aún no se sabe".
ALTER TABLE mantenimiento
   ALTER COLUMN costo DROP NOT NULL,
   ALTER COLUMN costo DROP DEFAULT;

-- `tipo` y `estado` son TEXT y no enums para que los valores históricos
-- sobrevivan si el conjunto permitido se amplía después — mismo criterio que
-- equipo_estado_historial.
ALTER TABLE mantenimiento
   ADD COLUMN IF NOT EXISTS referencia        SERIAL,
   ADD COLUMN IF NOT EXISTS tipo              TEXT NOT NULL DEFAULT 'CORRECTIVO',
   ADD COLUMN IF NOT EXISTS estado            TEXT NOT NULL DEFAULT 'EN_PROCESO',
   ADD COLUMN IF NOT EXISTS taller            TEXT,
   ADD COLUMN IF NOT EXISTS trabajo_realizado TEXT,
   ADD COLUMN IF NOT EXISTS fecha_fin         DATE,
   ADD COLUMN IF NOT EXISTS created_by        TEXT,
   ADD COLUMN IF NOT EXISTS created_by_name   TEXT,
   ADD COLUMN IF NOT EXISTS closed_by         TEXT,
   ADD COLUMN IF NOT EXISTS closed_by_name    TEXT;

-- ON DELETE SET NULL: borrar un gasto no debe borrar el mantenimiento, sólo
-- desvincular su enlace financiero.
ALTER TABLE mantenimiento
   ADD COLUMN IF NOT EXISTS gasto_id UUID REFERENCES gasto(id) ON DELETE SET NULL;

-- Responde "¿este equipo tiene un mantenimiento abierto?" — la pregunta que
-- hace el diálogo de reactivación en cada transición EN_MANTENIMIENTO -> ACTIVO.
CREATE INDEX IF NOT EXISTS idx_mantenimiento_abierto
   ON mantenimiento(equipo_id) WHERE fecha_fin IS NULL;

CREATE INDEX IF NOT EXISTS idx_mantenimiento_gasto_id
   ON mantenimiento(gasto_id) WHERE gasto_id IS NOT NULL;

-- El índice idx_mantenimiento_equipo_id ya existe (btree sobre equipo_id).
CREATE INDEX IF NOT EXISTS idx_mantenimiento_equipo_fecha
   ON mantenimiento(equipo_id, fecha_inicio DESC);
