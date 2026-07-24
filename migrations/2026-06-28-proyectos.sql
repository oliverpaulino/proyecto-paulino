-- Módulo de Proyectos: EXPRESS, NORMAL, GRANDE
-- tipo_servicio_id queda como UUID nullable sin FK —
-- la tabla tipo_servicio y la FK se agregan en la siguiente migración.

create table public.proyecto (
  id                  uuid        not null default extensions.uuid_generate_v4(),
  tipo_proyecto       text        not null check (tipo_proyecto in ('EXPRESS', 'NORMAL', 'GRANDE')),
  estado              text        not null default 'BORRADOR'
                                  check (estado in ('BORRADOR', 'COMPLETADO', 'EN PROGRESO', 'CANCELADO')),
  cliente_id          uuid        not null references public.cliente(id),
  cita_id             uuid        null references public.cita(id),
  tipo_servicio_id    uuid        null references public.servicio(id),     -- FK a tipo_servicio se añade en próxima migración
  tarifa_servicio     numeric(12,2) null default 0,
  total_cobrable      numeric(12,2) not null default 0,
  total_gasto_interno numeric(12,2) not null default 0,
  rentabilidad        numeric(12,2) not null default 0,
  notas               text        null,
  fecha_inicio        date        not null default current_date,
  fecha_fin           date        null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint proyecto_pkey primary key (id)
) tablespace pg_default;

create table public.proyecto_detalle (
  id               uuid          not null default extensions.uuid_generate_v4(),
  proyecto_id      uuid          not null references public.proyecto(id) on delete cascade,
  descripcion      text          not null,
  cantidad         numeric(10,2) not null default 1,
  precio_unitario  numeric(12,2) not null,
  subtotal         numeric(12,2) not null default 0,
  es_cobrable      boolean       not null default true,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  constraint proyecto_detalle_pkey primary key (id)
) tablespace pg_default;

-- empleado_id (no operador_id) para simplificar el join a nómina.
-- La relación a la tabla operador se puede añadir si se necesita la licencia.
create table public.proyecto_asignacion (
  id               uuid          not null default extensions.uuid_generate_v4(),
  proyecto_id      uuid          not null references public.proyecto(id) on delete cascade,
  empleado_id      uuid          not null references public.empleado(id),
  equipo_id        uuid          not null references public.equipo(id),
  horas_trabajadas numeric(6,2)  not null default 0,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  constraint proyecto_asignacion_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_proyecto_tipo     on public.proyecto           using btree (tipo_proyecto);
create index if not exists idx_proyecto_estado   on public.proyecto           using btree (estado);
create index if not exists idx_proyecto_cliente  on public.proyecto           using btree (cliente_id);
create index if not exists idx_pdetalle_proyecto on public.proyecto_detalle   using btree (proyecto_id);
create index if not exists idx_pasignacion_proj  on public.proyecto_asignacion using btree (proyecto_id);
