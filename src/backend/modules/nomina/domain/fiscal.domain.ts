// ─── Retenciones de ley: TSS (AFP + SFS) e ISR ───────────────────────────────
//
// Reglas dominicanas (DGII / TSS). El orden importa: los aportes del empleado a
// la TSS están exentos de ISR, así que se restan ANTES de aplicar la escala.
//
//   base    = bruto del período − AFP − SFS
//   anual   = base mensualizada × 12
//   isr     = escala del año fiscal aplicada a `anual`
//   retener = isr / 12, reprorrateado al período del ciclo
//
// Las cifras caducan por año fiscal. Ver `.claude/skills/nomina-isr-rd/` antes
// de tocar nada de aquí: dice qué verificar en dgii.gov.do y por qué.
//
// Verificado contra DGII (consulta CA687) y TSS (Resolución 01-2025) el
// 4 de agosto de 2026.

import type { FrecuenciaPago } from "./nomina.domain";

// ─── Escala del ISR ──────────────────────────────────────────────────────────

/**
 * Un tramo de la escala anual. `hasta: null` es el último (sin techo).
 *
 *   impuesto = fijo + (renta − base) × tasa
 *
 * `base` es el TECHO DEL TRAMO ANTERIOR, que no es lo mismo que el inicio de
 * este. La DGII publica los tramos abiertos por un centavo ("desde
 * 624,329.01") pero calcula el excedente sobre el número redondo (624,329.00).
 * Usar `desde` como punto de resta hace que el impuesto BAJE al cruzar la
 * frontera —en 624,329.00 daría 31,216.35 y en 624,329.01 daría 31,216.00— y
 * además contradice la resolución, que fija exactamente 31,216.00 ahí.
 *
 * Se guarda `fijo` explícito en vez de derivarlo acumulando los tramos
 * anteriores porque es como lo publica la DGII: copiar el número de la
 * resolución es verificable de un vistazo; recalcularlo, no.
 *
 * La escala 2026 publicada no es exactamente continua: el 15% llevado hasta
 * 624,329.00 da 31,216.35, pero el tramo siguiente arranca en 31,216.00 (los
 * montos de la resolución están redondeados). Se respetan los números
 * oficiales — son los auditables — así que en el intervalo de un centavo entre
 * un tramo y otro el impuesto puede diferir en 35 centavos ANUALES (menos de
 * 3 centavos al mes). No se "arregla": alterarlos daría cifras que no
 * coinciden con la resolución ni con la calculadora de la DGII.
 */
export interface TramoISR {
   /** Límite inferior del tramo (el primer peso que ya cae aquí). */
   desde: number;
   /** Límite superior inclusive. `null` en el tramo más alto. */
   hasta: number | null;
   /** Techo del tramo anterior: sobre esto se mide el excedente. */
   base: number;
   /** Monto fijo que arrastra el tramo (0 en los dos primeros). */
   fijo: number;
   /** Tasa marginal sobre el excedente de `base`. 0 en el tramo exento. */
   tasa: number;
}

export interface EscalaISR {
   anio: number;
   /** De dónde salen los números, para poder auditarlos sin buscar. */
   fuente: string;
   tramos: TramoISR[];
}

/**
 * Las escalas conocidas, en DATOS y no en código: la estructura misma cambia
 * de un año a otro, no solo los montos. 2027 (Ley 30-26) tiene CINCO tramos y
 * una tasa nueva de 27%, así que cualquier cosa que asuma cuatro tramos —un
 * arreglo de longitud fija, una cadena de `if`— se rompe al llegar el año.
 *
 * Nótese que la escala lleva congelada desde 2017: el Art. 327 del Código
 * Tributario ordena indexarla por inflación pero las leyes de presupuesto han
 * suspendido el ajuste año tras año. Un año nuevo NO implica cifras nuevas.
 */
export const ESCALAS_ISR: EscalaISR[] = [
   {
      anio: 2026,
      fuente: "DGII, Resolución DDG-AR1-2026-00001 (consulta CA687)",
      tramos: [
         { desde: 0, hasta: 416_220.0, base: 0, fijo: 0, tasa: 0 },
         { desde: 416_220.01, hasta: 624_329.0, base: 416_220.0, fijo: 0, tasa: 0.15 },
         { desde: 624_329.01, hasta: 867_123.0, base: 624_329.0, fijo: 31_216.0, tasa: 0.2 },
         { desde: 867_123.01, hasta: null, base: 867_123.0, fijo: 79_776.0, tasa: 0.25 },
      ],
   },
   {
      anio: 2027,
      fuente: "Ley 30-26, Art. 10",
      tramos: [
         { desde: 0, hasta: 480_000.0, base: 0, fijo: 0, tasa: 0 },
         { desde: 480_000.01, hasta: 685_000.0, base: 480_000.0, fijo: 0, tasa: 0.15 },
         { desde: 685_000.01, hasta: 910_000.0, base: 685_000.0, fijo: 30_750.0, tasa: 0.2 },
         { desde: 910_000.01, hasta: 4_800_000.0, base: 910_000.0, fijo: 75_750.0, tasa: 0.25 },
         { desde: 4_800_000.01, hasta: null, base: 4_800_000.0, fijo: 1_048_250.0, tasa: 0.27 },
      ],
   },
];

/**
 * La escala de un año fiscal, o `null` si no está cargada.
 *
 * Devolver `null` es deliberado: con un año sin escala la alternativa sería
 * usar la del año anterior, que es exactamente el error que este módulo existe
 * para evitar (2026 → 2027 cambia de 4 a 5 tramos). Quien llama decide qué
 * hacer, y la nómina lo reporta como retención no calculada en vez de retener
 * un número inventado.
 */
export function escalaDelAnio(anio: number): EscalaISR | null {
   return ESCALAS_ISR.find((e) => e.anio === anio) ?? null;
}

/** El año fiscal de un ciclo: el de su fecha de fin (cuando se devenga). */
export function anioFiscalDe(fecha: Date | string): number {
   if (typeof fecha === "string") return Number(fecha.slice(0, 4));
   return fecha.getFullYear();
}

/** Impuesto ANUAL sobre una renta neta anual, según la escala del año. */
export function isrAnual(rentaNetaAnual: number, escala: EscalaISR): number {
   if (rentaNetaAnual <= 0) return 0;

   /*
      Se busca por el TECHO y no por `desde`: los tramos publicados dejan un
      hueco de un centavo entre uno y otro (…624,329.00 | 624,329.01…), y una
      base con decimales puede caer justo ahí y no encontrar tramo. Tomar el
      primero cuyo techo cubre la renta no tiene huecos por construcción.
   */
   const tramo = escala.tramos.find((t) => t.hasta === null || rentaNetaAnual <= t.hasta);
   if (!tramo || tramo.tasa === 0) return 0;

   return tramo.fijo + (rentaNetaAnual - tramo.base) * tramo.tasa;
}

// ─── Topes y tasas de la TSS ─────────────────────────────────────────────────

/**
 * Cuota del EMPLEADO. NO es un 5.91% plano: por encima del tope el aporte deja
 * de crecer. Aplicar el porcentaje sin topar sobreestima la deducción y —peor—
 * subestima el ISR, porque infla la parte exenta de la base.
 *
 * Los topes se derivan del salario mínimo cotizable (SFS = 10 salarios,
 * AFP = 20), así que cambian cuando cambia el mínimo. Van por año igual que la
 * escala del ISR.
 */
export interface ParametrosTSS {
   /** Desde qué año fiscal aplican estos valores. */
   desdeAnio: number;
   fuente: string;
   afp: { tasa: number; tope: number };
   sfs: { tasa: number; tope: number };
}

/**
 * Ordenados del más reciente al más viejo: se toma el primero cuyo `desdeAnio`
 * no supere el año buscado.
 *
 * Los topes vigentes arrancaron el 1 de febrero de 2026 (salario mínimo
 * cotizable RD$23,223.00). Los de 2025 (mínimo RD$21,674.80) se conservan
 * porque un ciclo viejo que se recalcule debe usar los suyos, no los de hoy.
 */
export const PARAMETROS_TSS: ParametrosTSS[] = [
   {
      desdeAnio: 2026,
      fuente: "TSS, Resolución 01-2025 (vigente 01/02/2026; mínimo RD$23,223.00)",
      afp: { tasa: 0.0287, tope: 464_460.0 },
      sfs: { tasa: 0.0304, tope: 232_230.0 },
   },
   {
      desdeAnio: 2025,
      fuente: "TSS, Resolución 01-2025 (vigente 01/04/2025; mínimo RD$21,674.80)",
      afp: { tasa: 0.0287, tope: 433_496.0 },
      sfs: { tasa: 0.0304, tope: 216_748.0 },
   },
];

export function parametrosTSSDelAnio(anio: number): ParametrosTSS {
   const p = PARAMETROS_TSS.find((x) => anio >= x.desdeAnio);
   // El año anterior al primer registro cae aquí: se usan los más viejos que
   // se conocen. Es preferible a devolver null y no retener nada de TSS.
   return p ?? PARAMETROS_TSS[PARAMETROS_TSS.length - 1];
}

// ─── Cálculo del período ─────────────────────────────────────────────────────

/**
 * Cuántos períodos de esa frecuencia hay en un mes. Duplica a propósito la
 * constante de `nomina.domain`: aquí el uso es fiscal (mensualizar para la
 * escala anual) y no debe cambiar si algún día se ajusta el prorrateo salarial.
 */
const PERIODOS_POR_MES: Record<FrecuenciaPago, number> = {
   SEMANAL: 52 / 12,
   QUINCENAL: 2,
   MENSUAL: 1,
};

export interface RetencionesLey {
   afp: number;
   sfs: number;
   /** AFP + SFS: lo que se le descuenta al empleado por la TSS este período. */
   tss: number;
   /** Retención de ISR del período (ya reprorrateada desde la mensual). */
   isr: number;
   /** Base imponible mensualizada, para poder auditar el número. */
   base_mensual: number;
   /** Renta neta anualizada a la que se le aplicó la escala. */
   base_anual: number;
   /**
    * `null` si no había escala cargada para el año fiscal. La nómina lo
    * distingue de "0 por exento": uno es un dato, el otro un hueco.
    */
   anio_escala: number | null;
}

/**
 * Retenciones de ley de un empleado en un período.
 *
 * `bruto` es lo devengado en el PERÍODO del ciclo (quincena, semana, mes). Se
 * mensualiza para aplicar la escala, porque no existe escala quincenal: la
 * norma es mensual y anualizar la quincena ×24 distorsiona los tramos.
 *
 * OJO con los salarios variables (choferes por producción): anualizar cada mes
 * por separado SOBRE-RETIENE cuando el ingreso es irregular. Un mes bueno de
 * RD$120,000 se anualiza a RD$1,440,000 y paga 25% marginal aunque el chofer
 * cierre el año en RD$600,000. Eso NO es un bug: es el método legal (DGII
 * consultada sobre salario + comisiones). La corrección va por el IR-13 anual,
 * compensando el exceso contra retenciones futuras — no tocando este cálculo.
 */
export function calcularRetenciones(
   bruto: number,
   frecuenciaCiclo: FrecuenciaPago,
   anioFiscal: number
): RetencionesLey {
   if (!Number.isFinite(bruto) || bruto <= 0) {
      return {
         afp: 0,
         sfs: 0,
         tss: 0,
         isr: 0,
         base_mensual: 0,
         base_anual: 0,
         anio_escala: escalaDelAnio(anioFiscal)?.anio ?? null,
      };
   }

   const periodos = PERIODOS_POR_MES[frecuenciaCiclo] ?? 1;
   const brutoMensual = bruto * periodos;

   // Los topes de la TSS son MENSUALES: se topa el salario mensualizado y
   // luego se devuelve el aporte al período. Topar el bruto de la quincena
   // contra un tope mensual dejaría pasar el doble.
   const p = parametrosTSSDelAnio(anioFiscal);
   const afpMensual = Math.min(brutoMensual, p.afp.tope) * p.afp.tasa;
   const sfsMensual = Math.min(brutoMensual, p.sfs.tope) * p.sfs.tasa;

   const baseMensual = Math.max(0, brutoMensual - afpMensual - sfsMensual);
   const baseAnual = baseMensual * 12;

   const escala = escalaDelAnio(anioFiscal);
   // Sin escala no se inventa una retención: se devuelve 0 y `anio_escala` en
   // null para que la UI lo muestre como "no calculado", no como "exento".
   const isrMensual = escala ? isrAnual(baseAnual, escala) / 12 : 0;

   const alPeriodo = (mensual: number) => redondear(mensual / periodos);

   return {
      afp: alPeriodo(afpMensual),
      sfs: alPeriodo(sfsMensual),
      tss: alPeriodo(afpMensual + sfsMensual),
      isr: alPeriodo(isrMensual),
      base_mensual: redondear(baseMensual),
      base_anual: redondear(baseAnual),
      anio_escala: escala?.anio ?? null,
   };
}

/** A dos decimales: son pesos, y la suma de las partes debe cuadrar. */
function redondear(n: number): number {
   return Math.round(n * 100) / 100;
}
