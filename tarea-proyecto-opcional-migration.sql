-- Migración incremental: hace que tarea.proyecto_id sea OPCIONAL.
-- Aplicar solo si ya existe la tabla `tarea` con proyecto_id NOT NULL y FK ON DELETE CASCADE.
-- (Para instalaciones nuevas, tarea-migration.sql ya crea la tabla con la versión correcta.)

-- 1. Permitir NULL en proyecto_id (tareas sin proyecto).
ALTER TABLE public.tarea ALTER COLUMN proyecto_id DROP NOT NULL;

-- 2. Cambiar el FK de ON DELETE CASCADE a ON DELETE SET NULL:
--    al borrar un proyecto, sus tareas quedan sin proyecto en vez de eliminarse.
ALTER TABLE public.tarea DROP CONSTRAINT IF EXISTS tarea_proyecto_id_fkey;
ALTER TABLE public.tarea
  ADD CONSTRAINT tarea_proyecto_id_fkey
  FOREIGN KEY (proyecto_id) REFERENCES proyecto (id) ON DELETE SET NULL;
