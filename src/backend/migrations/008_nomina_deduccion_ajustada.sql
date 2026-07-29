-- ─────────────────────────────────────────────────────────────────────────────
-- 008_nomina_deduccion_ajustada.sql  — REVERTIDA
--
-- Esta migración añadía `payroll_cycle_employees.deducciones_ajuste` para
-- poder sobrescribir a mano cuánto se le descontaba al chofer en el ciclo.
--
-- Era el diseño equivocado: modificaba el monto cobrado sin dejar rastro de
-- POR QUÉ. Lo correcto es CREAR una deducción nueva (con su concepto y su
-- fecha) y que la nómina la sume como cualquier otra — así el descuento
-- siempre tiene un origen auditable en la tabla `deduccion`.
--
-- Ver 009_nomina_deducciones_desde_nomina.sql.
--
-- Se deja el DROP por si la 008 llegó a aplicarse en algún ambiente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_cycle_employees
   DROP COLUMN IF EXISTS deducciones_ajuste;
