-- Migration: 013_proyecto_referencia
-- Run with: psql "$DB_CONNECTION_STRING" -f src/backend/migrations/013_proyecto_referencia.sql
--
-- `proyecto` era la única entidad de cara al usuario sin código legible: en
-- gastos y costos se mostraba `proyecto.id` (un UUID) como si fuera la
-- referencia del proyecto. Esta migración le da el mismo tratamiento que ya
-- tienen cliente (CLI-001), gasto (GAS-001), equipo (EQU-001), etc.
--
-- El código visible (`PRO-001`) NO se guarda: se arma en la capa de
-- infraestructura a partir de este entero, igual que en los demás módulos.
-- Así el formato se puede cambiar sin migrar datos.

-- SERIAL crea la secuencia y el DEFAULT nextval(...). Las filas que ya existen
-- se numeran solas al agregarse la columna (Postgres rellena con el default),
-- pero en orden físico, no cronológico — se renumeran abajo por created_at
-- para que PRO-001 sea de verdad el proyecto más antiguo.
ALTER TABLE proyecto
   ADD COLUMN IF NOT EXISTS referencia SERIAL;

-- Renumerado cronológico de las filas preexistentes. Es idempotente en el
-- sentido de que correrlo dos veces deja la misma numeración (el ORDER BY es
-- estable por created_at + id), pero sólo tiene efecto real la primera vez.
WITH ordenados AS (
   SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS nuevo
   FROM proyecto
)
UPDATE proyecto p
   SET referencia = o.nuevo
   FROM ordenados o
   WHERE p.id = o.id;

-- La secuencia debe quedar por encima del máximo asignado, si no el próximo
-- INSERT colisiona con una referencia ya usada.
SELECT setval(
   pg_get_serial_sequence('proyecto', 'referencia'),
   COALESCE((SELECT MAX(referencia) FROM proyecto), 0) + 1,
   false
);

-- Dos proyectos no pueden compartir código: es lo que la gente va a teclear
-- en el buscador para identificar uno solo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_proyecto_referencia
   ON proyecto(referencia);
