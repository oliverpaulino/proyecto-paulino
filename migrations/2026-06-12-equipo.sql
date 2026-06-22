-- Equipos: maquinaria pesada de la empresa.
-- tipo y estado son enums nativos de Postgres. "disponible" se deriva del estado
-- (disponible = estado = 'ACTIVO'), por lo que no hay columna extra.

-- tipo_equipo: categorías de maquinaria
create type public.tipo_equipo as enum (
  'EXCAVADORA',
  'RETROEXCAVADORA',
  'BULLDOZER',
  'GRUA',
  'CAMION',
  'CARGADOR',
  'COMPACTADORA',
  'MONTACARGAS',
  'GENERADOR',
  'OTRO'
);

-- estado_equipo: estado operativo del equipo
create type public.estado_equipo as enum (
  'ACTIVO',
  'MANTENIMIENTO',
  'INACTIVO',
  'BAJA'
);

-- equipo: maquinaria
create table public.equipo (
  id uuid not null default extensions.uuid_generate_v4(),
  nombre character varying(255) not null,
  tipo public.tipo_equipo not null,
  estado public.estado_equipo not null default 'ACTIVO'::estado_equipo,
  costo_por_hora numeric(10, 2) not null default 0,
  placa character varying(20) null,
  modelo character varying(100) null,
  ano smallint null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint equipo_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_equipo_estado on public.equipo using btree (estado) tablespace pg_default;

-- seed de ejemplo
insert into public.equipo (nombre, tipo, estado, costo_por_hora, placa, modelo, ano) values
  ('Excavadora CAT 320',      'EXCAVADORA', 'ACTIVO',        3500.00, 'EX-1023', 'CAT 320',     2019),
  ('Camión Volteo Mack',      'CAMION',     'ACTIVO',        1800.00, 'L-409812', 'Mack Granite', 2021),
  ('Retroexcavadora JCB 3CX', 'RETROEXCAVADORA', 'MANTENIMIENTO', 2200.00, 'RE-7741', 'JCB 3CX',  2018);
