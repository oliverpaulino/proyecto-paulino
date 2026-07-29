-- Migration: 012_mantenimiento_multiples_gastos
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/012_mantenimiento_multiples_gastos.sql
--
-- Un mantenimiento suele generar VARIOS gastos (repuestos en un lugar, mano de
-- obra en otro, aceite en otro). La columna `mantenimiento.gasto_id` sólo
-- permitía uno, así que el enlace pasa a ser una tabla puente.
--
-- `costo` sigue existiendo: es el costo declarado del mantenimiento. Cuando hay
-- gastos enlazados, la app lo mantiene igual a la suma de ellos; cuando no hay
-- ninguno, se captura a mano.

CREATE TABLE IF NOT EXISTS mantenimiento_gasto (
   mantenimiento_id UUID        NOT NULL REFERENCES mantenimiento(id) ON DELETE CASCADE,
   gasto_id         UUID        NOT NULL REFERENCES gasto(id)         ON DELETE CASCADE,
   created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
   -- La PK compuesta impide enlazar dos veces el mismo gasto al mismo
   -- mantenimiento; el enlace no tiene identidad propia más allá del par.
   PRIMARY KEY (mantenimiento_id, gasto_id)
);

CREATE INDEX IF NOT EXISTS idx_mantenimiento_gasto_mantenimiento
   ON mantenimiento_gasto(mantenimiento_id);

CREATE INDEX IF NOT EXISTS idx_mantenimiento_gasto_gasto
   ON mantenimiento_gasto(gasto_id);

-- Migrar los enlaces uno-a-uno que ya existieran antes de soltar la columna.
INSERT INTO mantenimiento_gasto (mantenimiento_id, gasto_id)
SELECT id, gasto_id FROM mantenimiento WHERE gasto_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS idx_mantenimiento_gasto_id;

ALTER TABLE mantenimiento DROP COLUMN IF EXISTS gasto_id;
