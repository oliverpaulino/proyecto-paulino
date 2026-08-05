// ─── Nómina de choferes con mínimo garantizado ───────────────────────────────
//
// A un chofer se le paga por PRODUCCIÓN (cada conduce, según la tarifa que ese
// empleado tenga asignada para esa categoría de cobro), pero nunca menos de un
// MÍNIMO por período. Si la producción no llega al mínimo, la diferencia se
// paga como "complemento" — una línea visible, nunca un ajuste silencioso.
//
//   devengado   = Σ (cantidad|total_horas × empleado_categoria_tarifa.monto_pago)
//   mínimo      = empleado.salario
//   complemento = MAX(0, mínimo − devengado)
//   bruto       = devengado + complemento
//   neto        = bruto − seguro − deducciones
//
// OJO — el precio del conduce (`conduce.precio_unitario` / `subtotal`) es lo
// que se le COBRA AL CLIENTE. Lo que se le PAGA AL CHOFER es otra cosa:
// `empleado_categoria_tarifa.monto_pago`. Nunca usar `subtotal` para nómina.

export type FrecuenciaPago = "SEMANAL" | "QUINCENAL" | "MENSUAL";
export type EstadoCiclo = "ABIERTO" | "CALCULADO" | "CERRADO" | "PAGADO";

export const FRECUENCIAS_PAGO: FrecuenciaPago[] = ["SEMANAL", "QUINCENAL", "MENSUAL"];
export const ESTADOS_CICLO: EstadoCiclo[] = ["ABIERTO", "CALCULADO", "CERRADO", "PAGADO"];

/** Un ciclo CERRADO o PAGADO ya no se recalcula. */
export function cicloEsEditable(estado: EstadoCiclo): boolean {
   return estado === "ABIERTO" || estado === "CALCULADO";
}

// ─── Ciclo ───────────────────────────────────────────────────────────────────

export interface PayrollCycleProps {
   id: string;
   organization_id: string | null;
   nombre: string;
   frecuencia: FrecuenciaPago;
   fecha_inicio: Date;
   fecha_fin: Date;
   fecha_pago: Date | null;
   estado: EstadoCiclo;
   closed_at: Date | null;
   closed_by: string | null;
   /**
    * Gasto generado al cerrar el ciclo, por el total neto a pagar. `null`
    * mientras el ciclo no se haya cerrado.
    */
   gasto_id: string | null;
   created_at: Date;
   updated_at: Date;
}

export interface CreateCycleDTO {
   nombre: string;
   frecuencia: FrecuenciaPago;
   fecha_inicio: Date | string;
   fecha_fin: Date | string;
   fecha_pago?: Date | string | null;
   organization_id?: string | null;
}

export interface UpdateCycleDTO {
   nombre?: string;
   fecha_inicio?: Date | string;
   fecha_fin?: Date | string;
   fecha_pago?: Date | string | null;
   estado?: EstadoCiclo;
}

// ─── Desglose por tarifa ─────────────────────────────────────────────────────
// El "precio por viaje u hora" no es un solo número: un chofer puede tener
// varias tarifas en un mismo ciclo. Se guarda el desglose y la UI colapsa a
// un único precio cuando resulta una sola fila.

export interface TarifaDesglose {
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   /*
      Categoría del equipo (el "tipo de camión") con el que se generó esta
      producción. El desglose agrupa por (categoría, tarifa): una misma tarifa
      usada con dos categorías distintas produce DOS filas, porque de otro modo
      no se sabría con qué equipo se ganó el dinero.

      NULL solo en snapshots viejos: filas escritas antes de la migración 015 y
      ciclos cerrados que ya no se recalculan.
   */
   categoria_equipo_id: string | null;
   categoria_equipo_nombre: string | null;
   medida_cobro_nombre: string | null;
   cantidad: number;
   monto_pago: number; // precio unitario AL CHOFER
   subtotal: number; // cantidad × monto_pago

   /*
      Solo para las tarifas huérfanas (`categoria_equipo_tarifa_id` en NULL).
      Dice si el nombre snapshoteado corresponde HOY a una categoría viva, que
      es lo que decide si su precio se puede corregir desde la nómina:

        - "vinculable"  → hay exactamente una categoría con ese nombre. Se
                          puede editar: al guardar se usa `rescate_id`.
        - "ambigua"     → hay varias categorías con ese nombre. NO se re-vincula
                          sola: elegir mal sería pagarle al chofer la tarifa
                          equivocada, así que se pide desambiguar.
        - "sin_categoria" → no existe ninguna. Es el caso legítimo del snapshot
                          histórico: la categoría se borró y solo queda el nombre.

      `undefined` en las tarifas que sí tienen id: no hay nada que rescatar.
   */
   rescate?: "vinculable" | "ambigua" | "sin_categoria";
   /** Id al que re-vincular, solo cuando `rescate === "vinculable"`. */
   rescate_id?: string | null;
   /** Cuántas categorías vivas comparten el nombre (para explicar la ambigüedad). */
   rescate_candidatas?: number;

   /**
    * `true` si este `monto_pago` viene de un precio escrito a mano para este
    * ciclo, y no del catálogo. La UI lo marca: un monto manual no se explica
    * por la configuración del empleado, así que hay que poder distinguirlo.
    */
   precio_manual?: boolean;
   /** Por qué se puso a mano, si se anotó. */
   precio_manual_nota?: string | null;
}

/**
 * Precio escrito a mano para una tarifa que la nómina no puede resolver sola.
 * Aplica a UN empleado en UN ciclo; ver la migración 014.
 */
export interface PrecioManualProps {
   id: string;
   cycle_id: string;
   empleado_id: string;
   tarifa_nombre: string;
   monto_pago: number;
   nota: string | null;
   created_by: string | null;
}

// ─── Línea de nómina (un empleado dentro del ciclo) ──────────────────────────

export interface PayrollCycleEmployeeProps {
   id: string;
   cycle_id: string;
   empleado_id: string;
   empleado_nombre: string | null;
   frecuencia_pago: string | null;
   /** Rol del empleado al momento del cálculo (snapshot). */
   rol: string | null;
   /** PRODUCCION (choferes) o FIJO (asalariados). */
   modalidad: ModalidadPago;

   /**
    * Para PRODUCCION es el piso garantizado; para FIJO es el sueldo mismo.
    */
   minimo_garantizado: number;
   devengado_tarifas: number;
   complemento_minimo: number;

   seguro: number;

   /*
      Retenciones de ley. Se calculan solas (ver `fiscal.domain.ts`) y NO son
      deducciones: no se guardan en la tabla `deduccion` porque no son deudas
      con la empresa sino dinero que se entrega a la TSS y a la DGII.
      Valen 0 en los empleados sin `aplica_retenciones`.
   */
   afp: number;
   sfs: number;
   isr: number;
   /** Base imponible mensualizada usada para el ISR (bruto − AFP − SFS). */
   base_isr: number;
   /**
    * Año de la escala aplicada. `null` = no se pudo calcular porque no había
    * escala cargada para ese año fiscal. Distinto de 0 (exento): la UI debe
    * mostrarlo como pendiente, no como que no le toca pagar.
    */
   isr_anio_escala: number | null;

   /**
    * Suma de las deducciones del período. Siempre se recalcula desde la tabla
    * `deduccion`: para descontar más se CREA una deducción nueva, nunca se
    * sobrescribe este monto.
    */
   deducciones: number;

   deuda_total: number;
   deuda_pendiente: number;

   neto_pagar: number;

   total_conduces: number;
   /**
    * Conduces que no traían persona y se atribuyeron infiriendo por
    * `equipo.operador_id`. Si es > 0 la UI debe marcar la fila: es una
    * SUPOSICIÓN (el operador asignado hoy al camión pudo no haberlo manejado
    * ese día), no un dato duro.
    */
   conduces_inferidos: number;

   created_at: Date;
   updated_at: Date;

   tarifas?: TarifaDesglose[];
   /**
    * Cuántas deducciones componen el monto de `deducciones`. Es un COUNT
    * agregado, no las filas: el listado del ciclo solo necesita el número
    * para la fila colapsada ("N conceptos").
    */
   deducciones_count: number;
   /**
    * Deducciones concretas que componen el monto. NO viene en el listado del
    * ciclo — traerlas para todos sería una query por empleado. Se pide aparte
    * con `listDeduccionesDelPeriodo` al expandir la fila.
    */
   detalle_deducciones?: DeduccionDelPeriodo[];
}

/** Bruto antes de descuentos. */
export function calcularBruto(devengado: number, complemento: number): number {
   return devengado + complemento;
}

/** Lo que falta para llegar al mínimo garantizado (0 si ya lo superó). */
export function calcularComplemento(devengado: number, minimo: number): number {
   return Math.max(0, minimo - devengado);
}

/**
 * Cuántos períodos de esa frecuencia caben en un mes. Sirve para convertir un
 * salario expresado en una frecuencia al monto que toca en otra.
 *
 * SEMANAL usa 4.33 (52 semanas / 12 meses), no 4: con 4 se le pagaría de menos
 * al empleado unas 4 semanas al año.
 */
const PERIODOS_POR_MES: Record<FrecuenciaPago, number> = {
   SEMANAL: 52 / 12,
   QUINCENAL: 2,
   MENSUAL: 1,
};

/**
 * Convierte el salario del empleado al monto que le corresponde por el ciclo
 * que se está pagando.
 *
 *   salario mensual 30,000 en ciclo QUINCENAL  → 15,000
 *   salario quincenal 15,000 en ciclo MENSUAL  → 30,000
 *   salario mensual 30,000 en ciclo SEMANAL    → 6,928.57  (30,000 / 4.33)
 *
 * Si el empleado no tiene `frecuencia_pago` registrada se asume que su salario
 * está expresado en la misma frecuencia del ciclo, es decir, no se prorratea.
 * Es la suposición conservadora: pagar el monto tal cual, no inventar una
 * división que nadie configuró.
 */
export function salarioDelPeriodo(
   salario: number,
   frecuenciaEmpleado: string | null | undefined,
   frecuenciaCiclo: FrecuenciaPago
): number {
   const fEmp = (frecuenciaEmpleado ?? "").toUpperCase() as FrecuenciaPago;
   if (!FRECUENCIAS_PAGO.includes(fEmp)) return salario;
   if (fEmp === frecuenciaCiclo) return salario;

   // Se pasa por el mensual como unidad común.
   const mensual = salario * PERIODOS_POR_MES[fEmp];
   return mensual / PERIODOS_POR_MES[frecuenciaCiclo];
}

/**
 * Neto a pagar. Puede dar negativo si los descuentos superan al bruto.
 *
 * Va por objeto y no por posición a propósito: son cinco montos del mismo tipo
 * y todos se restan, así que invertir dos en la llamada no daría error de tipos
 * pero sí un pago equivocado.
 */
export function calcularNeto(p: {
   devengado: number;
   complemento: number;
   seguro: number;
   deducciones: number;
   /** Retenciones de ley del período (AFP + SFS + ISR). 0 si no aplican. */
   retenciones?: number;
}): number {
   return (
      calcularBruto(p.devengado, p.complemento) -
      p.seguro -
      p.deducciones -
      (p.retenciones ?? 0)
   );
}

// ─── Repositorio ─────────────────────────────────────────────────────────────

export interface ConduceParaNomina {
   conduce_id: string;
   empleado_id: string;
   /** true si el empleado se dedujo de `equipo.operador_id` y no del conduce. */
   inferido: boolean;
   fecha: Date;
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   /** Categoría del equipo, snapshoteada en el conduce vía `equipo.categoria_id`. */
   categoria_equipo_id: string | null;
   categoria_equipo_nombre: string | null;
   medida_cobro_nombre: string | null;
   /** Viajes/botes para CAMION, horas para EQUIPO_PESADO. */
   cantidad: number;
}

/** Una deducción concreta que cae dentro del período del ciclo. */
export interface DeduccionDelPeriodo {
   id: string;
   concepto: string;
   monto_total: number;
   fecha: Date;
}

/**
 * Cómo se le paga a este empleado:
 *   - PRODUCCION: choferes/operadores. Cobran por conduces, con `salario`
 *     como piso garantizado.
 *   - FIJO: el resto del personal. Cobra su `salario` del período; no tiene
 *     conduces y por tanto tampoco complemento.
 */
export type ModalidadPago = "PRODUCCION" | "FIJO";

export interface EmpleadoParaNomina {
   id: string;
   nombre: string;
   rol: string;
   modalidad: ModalidadPago;
   salario: number;
   frecuencia_pago: string | null;
   /**
    * Si se le retienen TSS e ISR. Por defecto `false`: muchos choferes cobran
    * por producción sin estar en planilla formal, y retenerles sin que nadie
    * lo pida cambiaría lo que se llevan a casa.
    */
   aplica_retenciones: boolean;
}

export interface INominaRepository {
   createCycle(dto: CreateCycleDTO): Promise<PayrollCycleProps>;
   updateCycle(id: string, dto: UpdateCycleDTO): Promise<PayrollCycleProps | null>;
   findCycleById(id: string): Promise<PayrollCycleProps | null>;
   listCycles(): Promise<PayrollCycleProps[]>;
   deleteCycle(id: string): Promise<boolean>;

   /**
    * Todos los empleados activos, con su modalidad de pago resuelta:
    * OPERADOR → PRODUCCION (cobra conduces con mínimo garantizado);
    * el resto → FIJO (cobra su salario del período).
    */
   listEmpleadosParaNomina(): Promise<EmpleadoParaNomina[]>;

   /**
    * Conduces del período con el empleado ya resuelto y la cantidad
    * normalizada. Resuelve la persona por COALESCE de tres niveles:
    *   conduce.empleado_id → operador.empleado_id → equipo→operador (inferido)
    */
   listConducesDelPeriodo(desde: Date, hasta: Date): Promise<ConduceParaNomina[]>;

   /** Mapa `categoria_equipo_tarifa_id → monto_pago` para un empleado. */
   getTarifasEmpleado(empleadoId: string): Promise<Map<string, number>>;

   /**
    * Mapa `nombre normalizado → id` de las categorías de tarifa cuyo nombre es
    * ÚNICO. Sirve para rescatar conduces que guardaron el nombre pero no el id:
    * sin esto se les paga RD$ 0 aunque la categoría exista.
    *
    * Los nombres repetidos se omiten a propósito: con dos categorías llamadas
    * igual no se puede saber cuál le toca al chofer, y adivinar sería pagarle
    * una tarifa que no es.
    */
   getTarifasPorNombreUnico(): Promise<Map<string, string>>;

   /**
    * Precios manuales del ciclo, indexados por `empleado_id` y nombre de
    * tarifa normalizado. Son la última palabra sobre lo que se le paga a ese
    * chofer por esa tarifa en ese ciclo.
    */
   getPreciosManuales(cycleId: string): Promise<Map<string, PrecioManualProps>>;

   /** Fija (o corrige) el precio manual de una tarifa. Idempotente. */
   upsertPrecioManual(data: {
      cycle_id: string;
      empleado_id: string;
      tarifa_nombre: string;
      monto_pago: number;
      nota?: string | null;
      created_by?: string | null;
   }): Promise<PrecioManualProps>;

   /** Quita el precio manual: la tarifa vuelve a valer lo que diga el catálogo. */
   deletePrecioManual(
      cycleId: string,
      empleadoId: string,
      tarifaNombre: string
   ): Promise<boolean>;

   /** Suma de deducciones cuya `fecha` cae dentro del período. */
   getDeduccionesDelPeriodo(empleadoId: string, desde: Date, hasta: Date): Promise<number>;

   /** Deuda histórica total del empleado (todas sus deducciones vivas). */
   getDeudaTotal(empleadoId: string): Promise<number>;

   /** Reemplaza el resumen del empleado en el ciclo (idempotente). */
   upsertCycleEmployee(
      // `deducciones_count` no se guarda: se deriva al leer, contando la tabla
      // `deduccion`. Pedirlo aquí obligaría a calcularlo para escribirlo.
      row: Omit<
         PayrollCycleEmployeeProps,
         "id" | "created_at" | "updated_at" | "tarifas" | "deducciones_count"
      >,
      tarifas: TarifaDesglose[]
   ): Promise<PayrollCycleEmployeeProps>;

   /**
    * Resumen de todos los empleados del ciclo. Incluye el desglose de tarifas
    * (una sola query para todo el ciclo) y el CONTEO de deducciones, pero no
    * el detalle de estas: ese se pide por empleado al expandir la fila.
    */
   listCycleEmployees(cycleId: string): Promise<PayrollCycleEmployeeProps[]>;
   findCycleEmployee(cycleId: string, empleadoId: string): Promise<PayrollCycleEmployeeProps | null>;

   /** Solo el `seguro` ya guardado, para no releer la fila entera al calcular. */
   getSeguroActual(cycleId: string, empleadoId: string): Promise<number | null>;

   /** Seguro es un campo libre: se edita a mano y se recalcula el neto. */
   updateSeguro(cycleEmployeeId: string, seguro: number): Promise<PayrollCycleEmployeeProps | null>;

   /**
    * Crea una deducción nueva para el empleado y devuelve su id. La nómina la
    * recogerá como cualquier otra: no se toca el monto ya calculado, se añade
    * un descuento con su propio concepto y fecha.
    */
   crearDeduccion(data: {
      empleado_id: string;
      monto_total: number;
      concepto: string;
      fecha: Date;
   }): Promise<string>;

   /**
    * Vuelve a leer las deducciones del período (para recoger las que se
    * crearon a mano después de calcular) sin tocar el resto del cálculo.
    */
   refrescarDeducciones(cycleId: string): Promise<number>;

   /** Detalle de las deducciones del período, para mostrarlas en la nómina. */
   listDeduccionesDelPeriodo(
      empleadoId: string,
      desde: Date,
      hasta: Date
   ): Promise<DeduccionDelPeriodo[]>;

   /** Borra los resúmenes del ciclo antes de recalcular. */
   clearCycleEmployees(cycleId: string): Promise<void>;

   /**
    * Crea el gasto de la nómina al cerrar el ciclo y lo enlaza en
    * `payroll_cycles.gasto_id`. Devuelve el id del gasto.
    */
   crearGastoDeNomina(data: {
      cycleId: string;
      monto_total: number;
      concepto: string;
      fecha: Date;
   }): Promise<string>;

   /** Id de la categoría de gasto usada para la nómina, si existe. */
   getCategoriaGastoNomina(): Promise<string | null>;
}
