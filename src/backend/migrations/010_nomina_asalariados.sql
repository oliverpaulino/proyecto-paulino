-- ─────────────────────────────────────────────────────────────────────────────
-- 010_nomina_asalariados.sql
--
-- Amplía la nómina al personal que NO es chofer (Ingeniero, Mecánico,
-- Contable, Mensajero).
--
-- Dos modalidades de pago conviven en el mismo ciclo:
--
--   PRODUCCION (rol OPERADOR)
--     devengado   = Σ conduces × tarifa del chofer
--     complemento = MAX(0, salario − devengado)     ← piso garantizado
--
--   FIJO (el resto)
--     devengado   = 0  (no tienen conduces)
--     complemento = salario del período              ← el sueldo íntegro
--
-- En ambos casos `bruto = devengado + complemento`, así que el neto se
-- calcula igual y no hace falta ramificar la fórmula. Para un asalariado el
-- "complemento" ES su sueldo; la UI lo etiqueta según la modalidad para no
-- mostrarle "complemento al mínimo" a un contable.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_cycle_employees
   ADD COLUMN IF NOT EXISTS rol text NULL,
   ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'PRODUCCION';

DO $$
BEGIN
   IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'chk_pce_modalidad'
   ) THEN
      ALTER TABLE public.payroll_cycle_employees
         ADD CONSTRAINT chk_pce_modalidad
         CHECK (modalidad IN ('PRODUCCION', 'FIJO'));
   END IF;
END $$;

COMMENT ON COLUMN public.payroll_cycle_employees.modalidad IS
   'PRODUCCION = cobra conduces con mínimo garantizado; FIJO = cobra su salario.';

COMMENT ON COLUMN public.payroll_cycle_employees.rol IS
   'Rol del empleado al momento del cálculo (snapshot).';

-- Las filas ya calculadas son todas de choferes: el default PRODUCCION es
-- correcto para ellas. Se rellena el rol donde se pueda.
UPDATE public.payroll_cycle_employees pce
SET rol = e.rol
FROM public.empleado e
WHERE e.id = pce.empleado_id AND pce.rol IS NULL;
