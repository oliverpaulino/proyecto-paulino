---
name: nomina-isr-rd
description: Reglas fiscales y de nómina dominicana (DGII/TSS) para este proyecto — escala del ISR, retención sobre salarios variables, topes de AFP/SFS, exenciones. Úsalo ANTES de escribir cualquier cálculo de ISR, retención, impuesto, AFP, SFS, TSS o base imponible, y al tocar el módulo `src/backend/modules/nomina/`. Las cifras caducan por año fiscal: este skill dice qué verificar en dgii.gov.do antes de confiar en ellas.
---

# Nómina e ISR — República Dominicana

## Lo primero: verifica la escala antes de usarla

**Las cifras de este documento tienen fecha de vencimiento.** La escala del ISR
cambia por año fiscal y la de 2027 ya está legislada y es distinta a la de 2026.

Antes de escribir o modificar cualquier cálculo de ISR:

1. Comprueba el año fiscal que estás calculando.
2. Verifica la escala vigente para ese año en la fuente oficial:
   - **Consulta CA687 de la DGII** — "¿Cuál es la escala salarial correspondiente
     al año X del Impuesto Sobre la Renta?"
     https://ayuda.dgii.gov.do/conversations/impuesto-sobre-la-renta-isr/
   - **Resolución anual de la DGII** (formato `DDG-AR1-<año>-00001`), publicada
     en https://dgii.gov.do/legislacion/resoluciones/
3. Verifica los topes de cotización TSS del año, que cambian con el salario
   mínimo (Resolución del CNSS/TSS).

Si lo que encuentras no coincide con lo que dice este archivo, **gana la fuente
oficial** — y actualiza este archivo.

## Escalas conocidas

Ambas son **anuales sobre renta neta** (después de restar AFP y SFS).

### 2026 — Resolución DDG-AR1-2026-00001

| Renta neta anual (RD$) | Impuesto |
|---|---|
| Hasta 416,220.00 | Exento |
| 416,220.01 – 624,329.00 | 15% del excedente de 416,220.01 |
| 624,329.01 – 867,123.00 | 31,216.00 + 20% del excedente de 624,329.01 |
| Desde 867,123.01 | 79,776.00 + 25% del excedente de 867,123.01 |

Exento mensual: **RD$34,685.00**. Cuatro tramos.

Esta escala lleva congelada desde 2017/2018: el Art. 327 del Código Tributario
ordena indexarla por inflación, pero las leyes de presupuesto han suspendido el
ajuste año tras año. **No asumas que cambia solo porque cambió el año.**

### 2027 — Ley 30-26, Art. 10

| Renta neta anual (RD$) | Impuesto |
|---|---|
| Hasta 480,000.00 | Exento |
| 480,000.01 – 685,000.00 | 15% del excedente |
| 685,000.01 – 910,000.00 | 30,750.00 + 20% del excedente |
| 910,000.01 – 4,800,000.00 | 75,750.00 + 25% del excedente |
| Desde 4,800,000.01 | 1,048,250.00 + 27% del excedente |

Exento mensual: **RD$40,000.00**. **Cinco** tramos y una tasa nueva de **27%**.

> La estructura cambia, no solo los números: pasa de 4 a 5 tramos. Por eso la
> escala debe vivir en datos (tabla con `anio_fiscal`), nunca hardcodeada ni en
> un arreglo de longitud fija.

## Cómo se calcula la retención

```
base   = bruto del mes − AFP − SFS
anual  = base × 12
isr    = aplicar la escala del año a `anual`
retener = isr / 12
```

Los aportes del empleado a la TSS **se restan antes** de aplicar la escala
(están exentos de ISR, confirmado por DGII).

### Topes TSS (cuota del EMPLEADO) — verificar por año

Vigentes desde el 1 de febrero de 2026 (Resolución TSS 01-2025, sobre salario
mínimo cotizable de RD$23,223.00):

| Concepto | Tasa | Tope salario cotizable |
|---|---|---|
| AFP (pensiones) | 2.87% | RD$464,460 (20 salarios mínimos) |
| SFS (salud) | 3.04% | RD$232,230 (10 salarios mínimos) |

**No es un 5.91% plano.** Por encima de los topes el aporte deja de crecer; si
aplicas el porcentaje sin topar, sobreestimas la deducción y subestimas el ISR.

## Salarios variables — el punto crítico de este proyecto

Los choferes cobran por producción (conduces), así que su ingreso varía cada
período. Lo que dice la norma:

- **No existe método YTD (acumulado) oficial.** La palabra "variable" no aparece
  en el Reglamento 139-98.
- La DGII, consultada sobre salario + comisiones, respondió que las comisiones
  forman parte del salario aunque sea variable, y que se calcula **mes a mes,
  anualizando el ingreso real de ese mes**.
- Comisiones, horas extras y bonificaciones se suman al salario del mes
  (Párrafo Art. 65 Reglamento 139-98).

**Consecuencia que debes conocer y no "arreglar" por tu cuenta:** anualizar cada
mes por separado **sobre-retiene** con ingresos irregulares. Un mes de
RD$120,000 se anualiza a RD$1,440,000 y paga 25% marginal, aunque el chofer
cierre el año en RD$600,000. Esto **no es un bug** — es el resultado del método
legal. La corrección es posterior:

- El empleador presenta el **IR-13** anual (vence en marzo).
- Si hubo exceso retenido, se **compensa contra retenciones futuras** del propio
  empleado, o se reembolsa previa autorización de DGII (formulario FI-GERE-003).
- **No hay obligación normativa de reliquidar en diciembre.** Muchas nóminas lo
  hacen de forma voluntaria; es defendible, pero si se implementa debe ser una
  línea explícita y trazable, nunca alterando retenciones ya declaradas.

## Exenciones

- **Salario de Navidad / regalía: EXENTO** hasta la doceava parte del salario
  anual (Art. 48 Reglamento 139-98). No entra en la base de retención mensual.
- **Bonificaciones: GRAVADAS.** Son renta ordinaria del mes.
- Indemnizaciones por accidente, cesantía, preaviso y viáticos: exentos
  (Art. 299 Código Tributario).
- **Múltiples empleadores:** el empleado elige un único agente de retención
  (el de mayor salario), vía formulario IR-10 (Art. 73).

## Pago quincenal

No existe escala quincenal: la norma es mensual. Dos prácticas válidas:

1. Calcular mensual y dividir entre 2 — sirve con salario fijo.
2. Q1 con proyección, Q2 con ajuste contra el real del mes — **es lo correcto
   con ingresos variables**, porque en la Q1 aún no se conoce la producción.

**Nunca anualices la quincena ×24.** No está en la norma y distorsiona los tramos.

## Decisiones ya tomadas en este proyecto

- **El ISR NO va en la tabla `deduccion`.** Esa tabla modela deudas del empleado
  con la empresa (daños, adelantos), con `balance_pendiente` y `equipo_id`. El
  ISR es dinero retenido que se entrega a la DGII, no una deuda que el chofer
  salda. Mezclarlos infla el reporte de deuda y permitiría que alguien "agregue"
  una retención fiscal a mano desde la nómina. Va como columna propia en
  `payroll_cycle_employees`, junto a `seguro`.
- El campo **`seguro`** actual es un monto libre editable, no AFP/SFS. Para
  calcular ISR correctamente hay que separarlo en AFP y SFS, que son los que
  forman la base imponible.
- `payroll_concepts.is_taxable` ya existe en el esquema con la etiqueta
  "aplica retención de impuestos", pero **ningún cálculo lo lee todavía**.

## Validación

La DGII **no publica el algoritmo**, solo una calculadora en línea. El método
`×12 → escala → ÷12` se deriva de los Arts. 65 y 67 del Reglamento 139-98 y del
comportamiento de esa calculadora. **Valida tu implementación contra la
calculadora oficial con varios casos** antes de darla por buena, incluyendo
salarios por encima de los topes de AFP y SFS.

## Fuentes

- DGII CA687 — escala del año: https://ayuda.dgii.gov.do/conversations/impuesto-sobre-la-renta-isr/
- Resolución DDG-AR1-2026-00001: https://dgii.gov.do/legislacion/resoluciones/
- Reglamento 139-98 (Arts. 48, 65, 67, 73): https://dgii.gov.do/legislacion/reglamentos/Documents/2004/139-98.pdf
- Guía 11 — Retenciones del ISR: https://dgii.gov.do/publicacionesOficiales/bibliotecaVirtual/contribuyentes/retencionesRetribucionesComplementarias/Documents/2-Guia-11-Retenciones%20del%20Impuesto%20Sobre%20la%20Renta.pdf
- Instructivo IR-3: https://dgii.gov.do/publicacionesOficiales/bibliotecaVirtual/contribuyentes/retencionesRetribucionesComplementarias/Documents/4-IR-3.pdf
- Salario de Navidad y exención: https://dgii.gov.do/legislacion/editorialJuridico/Paginas/salario-navidad-y-exencion-fiscal.aspx

*Verificado contra fuentes DGII el 26 de julio de 2026. Revalida la escala si
estás calculando un año fiscal distinto a 2026.*
