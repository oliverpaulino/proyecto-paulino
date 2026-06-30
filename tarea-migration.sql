-- Tareas (tasks) module — Kanban board + table view.
-- estado_tarea: 3 estados (PENDIENTE / EN_PROGRESO / COMPLETADA).
-- proyecto_id es OPCIONAL: las tareas pueden existir "sueltas" (sin proyecto).
-- Si el proyecto se elimina, sus tareas quedan sin proyecto (ON DELETE SET NULL).

DO $$ BEGIN
   CREATE TYPE public.estado_tarea AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');
EXCEPTION
   WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.tarea (
  id uuid not null default extensions.uuid_generate_v4 (),
  proyecto_id uuid null,
  nombre character varying(255) not null,
  descripcion text null,
  estado public.estado_tarea not null default 'PENDIENTE'::estado_tarea,
  fecha_inicio date null,
  fecha_fin date null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tarea_pkey primary key (id),
  constraint tarea_proyecto_id_fkey foreign KEY (proyecto_id) references proyecto (id) on delete SET NULL
) TABLESPACE pg_default;

create index IF not exists idx_tarea_proyecto_id on public.tarea using btree (proyecto_id) TABLESPACE pg_default;
