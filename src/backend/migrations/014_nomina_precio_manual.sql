-- ── Precio manual de una tarifa dentro de un ciclo ──────────────────────────
--
-- Cuando un conduce guardó el NOMBRE de la tarifa pero no su id, la nómina no
-- puede saber cuánto pagarle al chofer y lo cuenta en RD$ 0. Se recupera solo
-- si ese nombre corresponde a UNA categoría viva; si la categoría se borró o
-- hay varias con el mismo nombre, no hay a qué vincularlo y el chofer queda
-- sin cobrar un trabajo que sí hizo.
--
-- Esta tabla es la salida para ese caso: un precio escrito a mano, que aplica
-- SOLO a ese empleado en ESE ciclo. No toca `categoria_equipo_tarifa` (el
-- catálogo) ni `empleado_categoria_tarifa` (las tarifas del empleado), porque
-- con un nombre ambiguo no se sabe a cuál de las categorías pertenece: escribir
-- ahí sería adivinar y arriesgarse a pagarle mal en los demás ciclos.
--
-- Vive aparte de `payroll_cycle_employee_tarifas` a propósito: ese es un
-- SNAPSHOT que `calcularCiclo` borra y reescribe entero en cada recálculo. Un
-- precio manual guardado allí se perdería al primer recalcular, que es
-- justamente cuando tiene que seguir aplicando.
--
-- La clave es el NOMBRE de la tarifa, no su id, porque estas filas por
-- definición no tienen id: es lo único que las identifica.
CREATE TABLE IF NOT EXISTS public.payroll_cycle_precio_manual (
   id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   cycle_id     uuid NOT NULL,
   empleado_id  uuid NOT NULL,

   -- Nombre snapshoteado de la tarifa, normalizado (minúsculas, sin espacios
   -- al borde) para que "Bote" y "bote " sean la misma clave.
   tarifa_nombre_norm text NOT NULL,
   -- El nombre tal como se vio, para poder mostrarlo sin deformar.
   tarifa_nombre      text NOT NULL,

   monto_pago   numeric(12,2) NOT NULL DEFAULT 0,

   -- Quién lo puso y por qué: es un monto escrito a mano sobre una nómina, así
   -- que tiene que poder auditarse.
   nota         text NULL,
   created_by   text NULL,
   created_at   timestamptz NOT NULL DEFAULT now(),
   updated_at   timestamptz NOT NULL DEFAULT now(),

   CONSTRAINT fk_pcpm_cycle
      FOREIGN KEY (cycle_id)
      REFERENCES public.payroll_cycles (id) ON DELETE CASCADE,

   -- Un solo precio manual por empleado/tarifa dentro del ciclo: el upsert se
   -- apoya en esto para ser idempotente.
   CONSTRAINT uq_pcpm_ciclo_empleado_tarifa
      UNIQUE (cycle_id, empleado_id, tarifa_nombre_norm)
);

CREATE INDEX IF NOT EXISTS idx_pcpm_ciclo_empleado
   ON public.payroll_cycle_precio_manual (cycle_id, empleado_id);
