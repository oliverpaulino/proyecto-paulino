-- Inventory: dynamic categories (tipo_item) + items (item)
-- tipo_item replaces the old `tipo public.tipo_item` enum so categories are dynamic.
-- item.tipo_id is an FK -> tipo_item(id) ON DELETE CASCADE.

-- tipo_item: dynamic categories
create table public.tipo_item (
  id uuid not null default extensions.uuid_generate_v4(),
  nombre varchar(255) not null,
  descripcion text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tipo_item_pkey primary key (id),
  constraint tipo_item_nombre_key unique (nombre)
) tablespace pg_default;

-- item: inventory, tipo is now an FK
create table public.item (
  id uuid not null default extensions.uuid_generate_v4(),
  nombre varchar(255) not null,
  tipo_id uuid not null,
  descripcion text null,
  unidad varchar(50) null,
  stock numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint item_pkey primary key (id),
  constraint item_tipo_id_fkey foreign key (tipo_id)
    references public.tipo_item (id) on delete cascade
) tablespace pg_default;

create index item_tipo_id_idx on public.item (tipo_id);

-- seed a few categories
insert into public.tipo_item (nombre, descripcion) values
  ('Repuesto',    'Piezas de repuesto para maquinaria'),
  ('Herramienta', 'Herramientas de trabajo'),
  ('Insumo',      'Materiales consumibles');
