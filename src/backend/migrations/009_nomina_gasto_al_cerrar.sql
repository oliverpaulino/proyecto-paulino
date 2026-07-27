-- ─────────────────────────────────────────────────────────────────────────────
-- 009_nomina_gasto_al_cerrar.sql
--
-- Al CERRAR un ciclo de nómina se genera un `gasto` por el total neto a pagar,
-- para que la nómina entre en la contabilidad como cualquier otro egreso (y se
-- le puedan registrar pagos vía `pago.gasto_empresa_id`, que ya existe).
--
-- `payroll_cycles.gasto_id` guarda el vínculo. Es nullable porque un ciclo
-- ABIERTO/CALCULADO todavía no lo tiene, y sirve además de candado de
-- idempotencia: si ya hay gasto, cerrar de nuevo no crea otro.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_cycles
   ADD COLUMN IF NOT EXISTS gasto_id uuid NULL;

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_payroll_cycles_gasto'
   ) THEN
      ALTER TABLE public.payroll_cycles
         ADD CONSTRAINT fk_payroll_cycles_gasto
         FOREIGN KEY (gasto_id) REFERENCES public.gasto (id) ON DELETE SET NULL;
   END IF;
END $$;

COMMENT ON COLUMN public.payroll_cycles.gasto_id IS
   'Gasto generado al cerrar el ciclo. NULL mientras no se haya cerrado.';

-- Categoría de gasto para la nómina. `categoria_gasto` son datos editables por
-- el usuario, no un enum, así que se siembra solo si no existe una equivalente.
INSERT INTO public.categoria_gasto (nombre, grupo)
SELECT 'Nómina', 'Personal'
WHERE NOT EXISTS (
   SELECT 1 FROM public.categoria_gasto WHERE lower(nombre) = 'nómina'
);
