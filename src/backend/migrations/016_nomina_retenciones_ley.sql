-- Retenciones de ley (TSS e ISR) en la línea de nómina.
--
-- Por qué columnas propias y NO filas en la tabla `deduccion`:
-- `deduccion` modela DEUDAS del empleado con la empresa (daños, adelantos),
-- con `balance_pendiente` y `equipo_id`. El ISR y la TSS son dinero retenido
-- que se entrega a la DGII y a la Seguridad Social, no una deuda que el
-- empleado salde con la empresa. Mezclarlos inflaría el reporte de deuda y
-- permitiría "agregar" una retención fiscal a mano desde la nómina, que es
-- justo lo que no debe poder hacerse.
--
-- Van junto a `seguro`, que es otra cosa: un monto libre editable, no AFP/SFS.
-- Se deja como está (hay ciclos con valores puestos a mano) y las retenciones
-- de ley se calculan aparte.
ALTER TABLE payroll_cycle_employees
   ADD COLUMN IF NOT EXISTS afp NUMERIC(12, 2) NOT NULL DEFAULT 0,
   ADD COLUMN IF NOT EXISTS sfs NUMERIC(12, 2) NOT NULL DEFAULT 0,
   ADD COLUMN IF NOT EXISTS isr NUMERIC(12, 2) NOT NULL DEFAULT 0,
   -- Base imponible mensualizada (bruto del mes − AFP − SFS) sobre la que se
   -- aplicó la escala. Se guarda para poder AUDITAR la retención sin tener que
   -- recalcularla: si mañana cambia la escala, el snapshot sigue explicando de
   -- dónde salió el número que se le retuvo a esa persona ese período.
   ADD COLUMN IF NOT EXISTS base_isr NUMERIC(14, 2) NOT NULL DEFAULT 0,
   -- Año fiscal de la escala aplicada. NULL = no se pudo calcular porque no
   -- había escala cargada para ese año. Es distinto de 0: uno es "no lo sé",
   -- el otro es "exento". La UI los muestra diferente y no se debe colapsar.
   ADD COLUMN IF NOT EXISTS isr_anio_escala INTEGER;

-- Interruptor por empleado. Los choferes de este negocio suelen cobrar por
-- producción sin estar en planilla formal, así que retenerles por defecto
-- cambiaría lo que se les paga hoy sin que nadie lo pida. Se activa a mano
-- por persona; ver el comentario del servicio.
ALTER TABLE empleado
   ADD COLUMN IF NOT EXISTS aplica_retenciones BOOLEAN NOT NULL DEFAULT FALSE;
