-- ─────────────────────────────────────────────────────────────────────────────
-- 008_nomina_deduccion_ajustada.sql
--
-- Permite AJUSTAR a mano cuánto se le descuenta al chofer en el ciclo, sin
-- perder el dato de cuánto suman realmente sus deducciones del período.
--
--   deducciones          → lo que suman las deducciones del período (calculado)
--   deducciones_ajuste   → override manual; NULL = "usa el calculado"
--   deducciones_aplicadas = COALESCE(deducciones_ajuste, deducciones)
--
-- Se guardan las dos por separado a propósito: si solo se guardara el monto
-- final no habría forma de saber si 3,000 es lo que realmente debía o lo que
-- alguien decidió cobrarle, ni de detectar que sus deducciones cambiaron
-- después del ajuste.
--
-- Igual que `seguro`, el ajuste NO se pisa al recalcular el ciclo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_cycle_employees
   ADD COLUMN IF NOT EXISTS deducciones_ajuste numeric(12,2) NULL;

COMMENT ON COLUMN public.payroll_cycle_employees.deducciones IS
   'Suma real de las deducciones del período (recalculado, no editable).';

COMMENT ON COLUMN public.payroll_cycle_employees.deducciones_ajuste IS
   'Override manual de cuánto cobrarle en este ciclo. NULL = usar `deducciones`.';
