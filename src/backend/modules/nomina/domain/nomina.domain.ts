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
   medida_cobro_nombre: string | null;
   cantidad: number;
   monto_pago: number; // precio unitario AL CHOFER
   subtotal: number; // cantidad × monto_pago
}

// ─── Línea de nómina (un empleado dentro del ciclo) ──────────────────────────

export interface PayrollCycleEmployeeProps {
   id: string;
   cycle_id: string;
   empleado_id: string;
   empleado_nombre: string | null;
   frecuencia_pago: string | null;

   minimo_garantizado: number;
   devengado_tarifas: number;
   complemento_minimo: number;

   seguro: number;
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
   /** Deducciones concretas que componen el monto de `deducciones`. */
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

/** Neto a pagar. Puede dar negativo si los descuentos superan al bruto. */
export function calcularNeto(
   devengado: number,
   complemento: number,
   seguro: number,
   deducciones: number
): number {
   return calcularBruto(devengado, complemento) - seguro - deducciones;
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

export interface EmpleadoParaNomina {
   id: string;
   nombre: string;
   salario: number;
   frecuencia_pago: string | null;
}

export interface INominaRepository {
   createCycle(dto: CreateCycleDTO): Promise<PayrollCycleProps>;
   updateCycle(id: string, dto: UpdateCycleDTO): Promise<PayrollCycleProps | null>;
   findCycleById(id: string): Promise<PayrollCycleProps | null>;
   listCycles(): Promise<PayrollCycleProps[]>;
   deleteCycle(id: string): Promise<boolean>;

   /** Choferes activos (rol OPERADOR) candidatos a nómina. */
   listEmpleadosOperadores(): Promise<EmpleadoParaNomina[]>;

   /**
    * Conduces del período con el empleado ya resuelto y la cantidad
    * normalizada. Resuelve la persona por COALESCE de tres niveles:
    *   conduce.empleado_id → operador.empleado_id → equipo→operador (inferido)
    */
   listConducesDelPeriodo(desde: Date, hasta: Date): Promise<ConduceParaNomina[]>;

   /** Mapa `categoria_equipo_tarifa_id → monto_pago` para un empleado. */
   getTarifasEmpleado(empleadoId: string): Promise<Map<string, number>>;

   /** Suma de deducciones cuya `fecha` cae dentro del período. */
   getDeduccionesDelPeriodo(empleadoId: string, desde: Date, hasta: Date): Promise<number>;

   /** Deuda histórica total del empleado (todas sus deducciones vivas). */
   getDeudaTotal(empleadoId: string): Promise<number>;

   /** Reemplaza el resumen del empleado en el ciclo (idempotente). */
   upsertCycleEmployee(
      row: Omit<PayrollCycleEmployeeProps, "id" | "created_at" | "updated_at" | "tarifas">,
      tarifas: TarifaDesglose[]
   ): Promise<PayrollCycleEmployeeProps>;

   listCycleEmployees(cycleId: string): Promise<PayrollCycleEmployeeProps[]>;
   findCycleEmployee(cycleId: string, empleadoId: string): Promise<PayrollCycleEmployeeProps | null>;

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
