-- ─────────────────────────────────────────────────────────────────────────────
-- 007_payroll_cycles.sql
--
-- Nómina de choferes con MÍNIMO GARANTIZADO.
--
-- Modelo de cálculo por empleado y ciclo:
--   devengado    = Σ (cantidad|total_horas × empleado_categoria_tarifa.monto_pago)
--   mínimo       = empleado.salario           (por período, según frecuencia_pago)
--   complemento  = MAX(0, mínimo − devengado)
--   bruto        = devengado + complemento
--   neto         = bruto − seguro − deducciones
--
-- El complemento se guarda como columna propia (y como payroll_item con el
-- concepto COMP_MINIMO) para que sea VISIBLE: el chofer y contabilidad deben
-- poder ver "ganaste 8,400 por viajes, se te completó 1,600 para llegar al
-- mínimo de 10,000", nunca un ajuste silencioso.
--
-- `payroll_items.cycle_id` ya existía en el código apuntando a esta tabla,
-- que hasta ahora NO EXISTÍA. Esta migración la crea y añade la FK.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ciclo de nómina (el período que se paga) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_cycles (
   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   organization_id text NULL,

   nombre          text NOT NULL,             -- "Quincena 1 - Julio 2026"
   frecuencia      text NOT NULL,             -- SEMANAL | QUINCENAL | MENSUAL

   fecha_inicio    date NOT NULL,
   fecha_fin       date NOT NULL,
   fecha_pago      date NULL,

   -- ABIERTO    → recién creado, aún no se calcula
   -- CALCULADO  → ya corrió el motor; se puede recalcular
   -- CERRADO    → montos congelados, no se recalcula
   -- PAGADO     → se emitieron los pagos
   estado          text NOT NULL DEFAULT 'ABIERTO',

   closed_at       timestamptz NULL,
   closed_by       text NULL,

   created_at      timestamptz NOT NULL DEFAULT now(),
   updated_at      timestamptz NOT NULL DEFAULT now(),

   CONSTRAINT chk_payroll_cycle_estado
      CHECK (estado IN ('ABIERTO', 'CALCULADO', 'CERRADO', 'PAGADO')),
   CONSTRAINT chk_payroll_cycle_frecuencia
      CHECK (frecuencia IN ('SEMANAL', 'QUINCENAL', 'MENSUAL')),
   CONSTRAINT chk_payroll_cycle_rango
      CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_payroll_cycles_rango
   ON public.payroll_cycles (fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_payroll_cycles_estado
   ON public.payroll_cycles (estado);

-- Dos ciclos de la misma frecuencia no pueden solaparse.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_cycles_periodo
   ON public.payroll_cycles (frecuencia, fecha_inicio, fecha_fin);


-- ── Resumen congelado por empleado dentro del ciclo ─────────────────────────
-- Snapshot: una vez CERRADO el ciclo, estos montos NO se recalculan aunque
-- después cambien las tarifas, el salario o los conduces.
CREATE TABLE IF NOT EXISTS public.payroll_cycle_employees (
   id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   cycle_id            uuid NOT NULL,
   empleado_id         uuid NOT NULL,

   -- Snapshots del empleado al momento del cálculo
   empleado_nombre     text NULL,
   frecuencia_pago     text NULL,

   -- Producción
   minimo_garantizado  numeric(12,2) NOT NULL DEFAULT 0,  -- empleado.salario
   devengado_tarifas   numeric(12,2) NOT NULL DEFAULT 0,  -- Σ conduces
   complemento_minimo  numeric(12,2) NOT NULL DEFAULT 0,  -- MAX(0, min − dev)

   -- Descuentos
   seguro              numeric(12,2) NOT NULL DEFAULT 0,  -- campo libre editable
   deducciones         numeric(12,2) NOT NULL DEFAULT 0,  -- deducciones del período

   -- Deuda (informativo: total acumulado vs. lo que se cobra en este ciclo)
   deuda_total         numeric(12,2) NOT NULL DEFAULT 0,
   deuda_pendiente     numeric(12,2) NOT NULL DEFAULT 0,

   neto_pagar          numeric(12,2) NOT NULL DEFAULT 0,

   -- Trazabilidad de la calidad del dato
   total_conduces      integer NOT NULL DEFAULT 0,
   -- Cuántos conduces NO traían persona y se atribuyeron infiriendo por
   -- `equipo.operador_id`. Si > 0, la UI debe marcar la fila: es una
   -- SUPOSICIÓN (el operador asignado hoy al camión pudo no ser quien
   -- lo manejó ese día), no un dato duro.
   conduces_inferidos  integer NOT NULL DEFAULT 0,

   created_at          timestamptz NOT NULL DEFAULT now(),
   updated_at          timestamptz NOT NULL DEFAULT now(),

   CONSTRAINT fk_pce_cycle
      FOREIGN KEY (cycle_id) REFERENCES public.payroll_cycles (id) ON DELETE CASCADE,
   CONSTRAINT fk_pce_empleado
      FOREIGN KEY (empleado_id) REFERENCES public.empleado (id),
   CONSTRAINT uq_pce_cycle_empleado UNIQUE (cycle_id, empleado_id)
);

CREATE INDEX IF NOT EXISTS idx_pce_cycle
   ON public.payroll_cycle_employees (cycle_id);
CREATE INDEX IF NOT EXISTS idx_pce_empleado
   ON public.payroll_cycle_employees (empleado_id);


-- ── Desglose por tarifa (el "precio por viaje u hora") ──────────────────────
-- Un chofer puede tener VARIAS tarifas distintas en un mismo ciclo
-- ("Arena - Viaje" a 350, "Grava - Bote" a 500). Esta tabla guarda el
-- desglose para poder mostrarlo agrupado; si resulta una sola fila, la UI
-- colapsa a un único precio.
CREATE TABLE IF NOT EXISTS public.payroll_cycle_employee_tarifas (
   id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   cycle_employee_id        uuid NOT NULL,

   -- best-effort: la tarifa origen puede desaparecer (hard-replace), por eso
   -- el nombre y la medida van snapshoteados como texto.
   categoria_equipo_tarifa_id     uuid NULL,
   categoria_equipo_tarifa_nombre text NOT NULL,
   medida_cobro_nombre            text NULL,

   cantidad     numeric(12,2) NOT NULL DEFAULT 0,  -- viajes/botes u horas
   monto_pago   numeric(12,2) NOT NULL DEFAULT 0,  -- precio unitario AL CHOFER
   subtotal     numeric(12,2) NOT NULL DEFAULT 0,  -- cantidad × monto_pago

   created_at   timestamptz NOT NULL DEFAULT now(),

   CONSTRAINT fk_pcet_cycle_employee
      FOREIGN KEY (cycle_employee_id)
      REFERENCES public.payroll_cycle_employees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pcet_cycle_employee
   ON public.payroll_cycle_employee_tarifas (cycle_employee_id);


-- ── FK que faltaba: payroll_items.cycle_id ──────────────────────────────────
-- La columna ya existía en el código apuntando a una tabla inexistente.
DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_items_cycle'
   ) THEN
      ALTER TABLE public.payroll_items
         ADD CONSTRAINT fk_payroll_items_cycle
         FOREIGN KEY (cycle_id) REFERENCES public.payroll_cycles (id) ON DELETE CASCADE;
   END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payroll_items_cycle_employee
   ON public.payroll_items (cycle_id, employee_id);

-- Evita duplicar el ingreso de un mismo conduce al recalcular
-- (`source_ref_id` = conduce.id). Es el respaldo en BD de
-- `existsForAttendance()`.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_items_source
   ON public.payroll_items (cycle_id, employee_id, concept_id, source_ref_id)
   WHERE source_ref_id IS NOT NULL;


-- ── Conceptos base de la nómina de choferes ─────────────────────────────────
-- `payroll_concepts` no se creó vía migración, así que no se puede asumir un
-- índice único sobre `code` (ON CONFLICT fallaría). Se inserta solo lo que
-- todavía no existe.
INSERT INTO public.payroll_concepts (code, name, category, sign, is_taxable, is_active)
SELECT v.code, v.name, v.category, v.sign, v.is_taxable, true
FROM (VALUES
   ('PROD_CONDUCE', 'Producción por conduces',  'earning',   1, true),
   ('COMP_MINIMO',  'Complemento al mínimo',    'earning',   1, true),
   ('SEGURO',       'Seguro',                   'deduction', 1, false),
   ('DEDUC_DEUDA',  'Deducciones / deuda',      'deduction', 1, false)
) AS v(code, name, category, sign, is_taxable)
WHERE NOT EXISTS (
   SELECT 1 FROM public.payroll_concepts pc WHERE pc.code = v.code
);
