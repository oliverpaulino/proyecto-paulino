-- Categoría del equipo en el desglose de tarifas de la nómina.
--
-- Por qué: el desglose agrupaba solo por tarifa, así que dos camiones de
-- categorías distintas que comparten la tarifa "Viaje" caían en una sola fila
-- y no había forma de saber con qué equipo se generó la producción. A partir
-- de aquí el desglose agrupa por (categoría, tarifa) y necesita el nombre de
-- la categoría para poder mostrarlo.
--
-- Ambas columnas son NULLABLE a propósito:
--   - Las filas ya existentes no tienen de dónde sacar la categoría. Se llenan
--     solas al recalcular el ciclo; los ciclos CERRADOS no se recalculan, así
--     que se quedan en NULL para siempre. Es correcto: son un snapshot
--     histórico y reescribirlos sería inventar datos.
--   - `categoria_equipo_id` es best-effort igual que `categoria_equipo_tarifa_id`:
--     si la categoría se borra, el nombre snapshoteado sobrevive y sigue
--     sirviendo para mostrar el desglose.
ALTER TABLE payroll_cycle_employee_tarifas
   ADD COLUMN IF NOT EXISTS categoria_equipo_id UUID
      REFERENCES categoria_equipo(id) ON DELETE SET NULL,
   ADD COLUMN IF NOT EXISTS categoria_equipo_nombre TEXT;
