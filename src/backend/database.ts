import { Kysely, PostgresDialect, Generated } from "kysely";
import { Pool } from "pg";

export interface ServicioTable {
   id: Generated<string>;
   nombre: string;
   is_custom: Generated<boolean>;
   activo: Generated<boolean>;
   created_at: Generated<Date>;
   updated_at: Generated<Date>;
}

export interface ServicioTarifaTable {
   id: Generated<string>;
   servicio_id: string;
   categoria_equipo_id: string;
   precio_sugerido: number;
   created_at: Generated<Date>;
}

// ── NUEVO: tarifas propias del proyecto. Referencian categoria_equipo_tarifa ──
// ── con ON DELETE CASCADE: si esa tarifa desaparece (tu update() actual la ──
// ── borra y reinserta en cada edición de la categoría — ver nota en el   ──
// ── chat), el override del proyecto se limpia solo en vez de romper el   ──
// ── guardado. Se snapshotea el nombre para no depender de un join vivo.  ──
export interface ProyectoTarifaTable {
   id: Generated<string>;
   proyecto_id: string;
   categoria_equipo_tarifa_id: string;
   categoria_equipo_tarifa_nombre: string;
   categoria_equipo_nombre: string;
   medida_cobro_nombre: string;
   precio_unitario: number;
   created_at: Generated<Date>;
   updated_at: Generated<Date>;
}

// ── NUEVO: Conduce con dos subtipos (CAMION / EQUIPO_PESADO). El precio se ──
// ── resuelve vía categoria_equipo_tarifa (categoría + medida_cobro +      ──
// ── precio + cobra_minimo), que YA EXISTE y la administras tú.           ──
// ── categoria_equipo_tarifa_id es NULLABLE con ON DELETE SET NULL a      ──
// ── propósito: tu update() de categoria-equipo hace hard-replace (borra  ──
// ── y reinserta TODAS las tarifas de la categoría en cada edición), así  ──
// ── que el id puede dejar de existir. El conduce NUNCA depende de ese id ──
// ── para mostrarse — el nombre y la medida de cobro quedan snapshoteados ──
// ── como texto en el momento del registro (igual que un papel físico:    ──
// ── el precio/condición queda congelado aunque la config cambie después).──
export interface ConduceTable {
   id: Generated<string>;
   tipo_conduce: string; // 'CAMION' | 'EQUIPO_PESADO'
   numero_referencia: string; // folio físico que digita la oficina
   fecha: Date;

   proyecto_id: string | null;
   cliente_id: string;
   cliente_telefono: string | null;

   equipo_id: string;

   // ── Persona que operó el equipo ────────────────────────────────────────
   // Hay DOS columnas y AMBAS son nullable (FK ON DELETE SET NULL):
   //   - empleado_id → empleado.id   (referencia directa)
   //   - operador_id → operador.id   (perfil de operador; empleado vía
   //                                  operador.empleado_id)
   // En los datos actuales son mutuamente excluyentes: unas filas traen
   // empleado_id, otras operador_id, y muchas NINGUNA de las dos.
   // Para resolver el empleado real SIEMPRE usa:
   //   COALESCE(conduce.empleado_id, operador.empleado_id)
   // con LEFT JOIN operador ON operador.id = conduce.operador_id.
   // Filtrar solo por `operador.empleado_id` deja fuera los conduces que
   // traen empleado_id directo.
   empleado_id: string | null;
   operador_id: string | null;
   categoria_equipo_id: string; // snapshot, vía equipo.categoria_id

   categoria_equipo_tarifa_id: string | null; // best-effort, puede quedar NULL (ver nota arriba)
   categoria_equipo_tarifa_nombre: string; // snapshot — SIEMPRE presente, no depende del id
   medida_cobro_nombre: string; // snapshot — SIEMPRE presente

   es_cobrable: boolean;
   observaciones: string | null;

   precio_unitario: number;
   subtotal: Generated<number>;

   // Exclusivos de CAMION
   procedencia: string | null;
   destino: string | null;
   cantidad: number | null;
   firma_chofer: Generated<boolean>;
   firma_recibido: Generated<boolean>;

   // Exclusivos de EQUIPO_PESADO
   horario_manana_inicio: string | null; // "HH:mm"
   horario_manana_fin: string | null;
   horario_tarde_inicio: string | null;
   horario_tarde_fin: string | null;
   total_horas: number | null;
   combustible_pagado_cliente: boolean | null;
   firma_observante: Generated<boolean>;
   firma_camionero: Generated<boolean>;

   created_by: string | null;
   created_by_name: string | null;
   created_at: Generated<Date>;
   updated_at: Generated<Date>;

   // ── NUEVO: eliminación LÓGICA ──────────────────────────────────────────
   // Nunca se hace DELETE físico sobre esta tabla. Al "eliminar" un conduce
   // solo se llenan estas columnas; el registro sigue existiendo para
   // auditoría y para poder restaurarlo. Los repos deben filtrar
   // `deleted_at IS NULL` en todo listado normal. Requiere migración, ver
   // migration_conduce_soft_delete.sql.
   deleted_by: string | null;
   deleted_by_name: string | null;
   deleted_at: Date | null;
   deleted_reason: string | null;
}

export interface EmpleadoCategoriaTarifaTable {
   id: Generated<string>;
   empleado_id: string;
   categoria_equipo_tarifa_id: string; // <-- AHORA SÍ, apunta al "Bote" o "Viaje"
   monto_pago: number;
   created_at: Generated<Date>;
   updated_at: Generated<Date>;
}

// Y dentro del type DB, agrégala:
// ... tus otras tablas[cite: 3]

export interface DB {
   cliente: {
      id: Generated<string>;
      referencia: Generated<number>;
      nombre: string;
      identificacion: string;
      tipo_identificacion: string;
      tipo_cliente: string;
      email: string | null;
      telefono: string | null;
      direccion: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   contact: {
      id: string;
      client_id: string;
      name: string;
      email: string;
      phone: string;
      job_title: string;
      created_at: Date;
      updated_at: Date;
   };

   empleado: {
      id: Generated<string>;
      referencia: Generated<number>;
      nombre: string;
      identificacion: string;
      tipo_identificacion: string;
      frecuencia_pago: string; // <-- Agregado el campo de frecuencia de pago
      rol: string;
      salario: number;
      activo: boolean;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };
   empleado_categoria_tarifa: EmpleadoCategoriaTarifaTable;

   contact_empleado: {
      id: Generated<string>;
      empleado_id: string;
      name: string;
      email: string | null;
      phone: string | null;
      job_title: string | null;
      created_at: Date;
      updated_at: Date;
   };

   operador: {
      id: Generated<string>;
      empleado_id: string;
      licencia: string;
      fecha_vencimiento: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   amonestacion: {
      id: Generated<string>;
      empleado_id: string | null;
      fecha: Date;
      descripcion: string;
      monto_descuento: string;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   proveedor: {
      id: Generated<string>;
      referencia: Generated<number>;
      nombre: string;
      tipo: string;
      rnc: string;
      telefono: string | null;
      email: string | null;
      direccion: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   item: {
      id: Generated<string>;
      nombre: string;
      tipo_id: string;
      descripcion: string | null;
      unidad: string | null;
      stock: Generated<number>;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   tipo_item: {
      id: Generated<string>;
      nombre: string;
      descripcion: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   servicio: {
      id: Generated<string>;
      nombre: string;
      tipo: string;
      descripcion: string | null;
      precio_base: number;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   medida_cobro: {
      id: Generated<string>;
      nombre: string; // "Viaje", "Bote", "Hora", etc.
      descripcion: string | null;
      permite_decimales: Generated<boolean>;
      is_active: Generated<boolean>;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   }

   categoria_equipo: {
      id: Generated<string>;
      nombre: string;
      metraje: number | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   // Una categoria_equipo puede tener varias tarifas (p.ej. "Arena - Viaje",
   // "Arena - Bote", "Hora normal"), cada una con su propia medida_cobro y
   // precio. OJO: el update() actual de este módulo hace hard-replace
   // (borra+reinserta), así que estos ids NO son estables entre ediciones —
   // ver nota extensa en ConduceTable arriba.
   categoria_equipo_tarifa: {
      id: Generated<string>;
      nombre: string;
      categoria_equipo_id: string;
      medida_cobro_id: string;
      precio_unitario: number;
      cobra_minimo: number | null;
      created_at: Generated<Date>;
   }

   equipo: {
      id: Generated<string>;
      referencia: Generated<number>;
      nombre: string;
      operador_id: string | null;
      operador_nombre: string | null;
      categoria_id: string;
      estado: Generated<string>;
      costo_por_hora: Generated<number>;
      placa: string | null;
      modelo: string | null;
      ano: number | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   orden_compra: {
      id: Generated<string>;
      referencia: Generated<number>;
      proveedor_id: string;
      fecha: Date;
      estado: Generated<string>;
      notas: string | null;
      total: Generated<number>;
      approved_by: string | null;
      approved_by_name: string | null;
      approved_at: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
      deleted_by: string | null;
      deleted_at: Date | null;
      deleted_reason: string | null;
   };

   purchase_order_approvers: {
      user_id: string;
      user_name: string;
      is_protected: boolean;
      granted_by: string;
      granted_at: Generated<Date>;
   };

   orden_compra_item: {
      id: Generated<string>;
      orden_compra_id: string;
      equipo_id: string | null;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   equipo_estado_historial: {
      id: Generated<string>;
      equipo_id: string;
      estado_anterior: string | null;
      estado_nuevo: string;
      changed_by: string | null;
      changed_by_name: string | null;
      nota: string | null;
      created_at: Generated<Date>;
   };

   /**
    * Bitácora de mantenimientos. Una fila está ABIERTA mientras `fecha_fin`
    * sea null — es el estado en que queda el equipo al pasar a
    * EN_MANTENIMIENTO, y se cierra al devolverlo a ACTIVO.
    * `gasto_id` enlaza el costo con el módulo de gastos (creado o existente).
    */
   mantenimiento: {
      id: Generated<string>;
      referencia: Generated<number>;
      equipo_id: string;
      tipo: Generated<string>;
      estado: Generated<string>;
      descripcion: string;
      taller: string | null;
      trabajo_realizado: string | null;
      /**
       * Costo declarado. Con gastos enlazados la app lo mantiene igual a la
       * suma de `mantenimiento_gasto`; sin ellos se captura a mano.
       */
      costo: number | null;
      fecha_inicio: Generated<Date>;
      fecha_fin: Date | null;
      created_by: string | null;
      created_by_name: string | null;
      closed_by: string | null;
      closed_by_name: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   /** Un mantenimiento puede tener varios gastos (repuestos, mano de obra…). */
   mantenimiento_gasto: {
      mantenimiento_id: string;
      gasto_id: string;
      created_at: Generated<Date>;
   };

   payroll_concepts: {
      id: Generated<string>;
      organization_id: string | null;
      code: string;
      name: string;
      category: string;
      sign: number;
      is_taxable: boolean;
      is_active: boolean;
      accounting_rule_id: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   payroll_concept_rules: {
      id: Generated<string>;
      concept_id: string;
      applies_to: string;
      target_id: string | null;
      trigger: string;
      amount_mode: string;
      amount_value: number;
      effective_from: Date;
      effective_to: Date | null;
      priority: number;
      project_location_filter: string | null;
      is_active: boolean;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   // ── Nómina: ciclo (período que se paga) ──────────────────────────────────
   // Ver migración 007_payroll_cycles.sql. `payroll_items.cycle_id` ya
   // apuntaba aquí desde el código antes de que la tabla existiera.
   payroll_cycles: {
      id: Generated<string>;
      organization_id: string | null;
      nombre: string;
      frecuencia: string; // SEMANAL | QUINCENAL | MENSUAL
      fecha_inicio: Date;
      fecha_fin: Date;
      fecha_pago: Date | null;
      estado: Generated<string>; // ABIERTO | CALCULADO | CERRADO | PAGADO
      closed_at: Date | null;
      closed_by: string | null;
      // Gasto generado al cerrar el ciclo (ver migración 009). NULL mientras
      // no se haya cerrado; sirve de candado de idempotencia.
      gasto_id: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   // Snapshot congelado por empleado dentro del ciclo. Una vez CERRADO, estos
   // montos no se recalculan aunque cambien tarifas, salario o conduces.
   payroll_cycle_employees: {
      id: Generated<string>;
      cycle_id: string;
      empleado_id: string;
      empleado_nombre: string | null;
      frecuencia_pago: string | null;
      rol: string | null; // snapshot al momento del cálculo
      // PRODUCCION = cobra conduces con mínimo garantizado (choferes);
      // FIJO = cobra su salario del período (resto del personal).
      modalidad: Generated<string>;
      minimo_garantizado: Generated<number>; // empleado.salario
      devengado_tarifas: Generated<number>; // Σ conduces × monto_pago
      complemento_minimo: Generated<number>; // MAX(0, mínimo − devengado)
      seguro: Generated<number>; // campo libre editable
      // Suma de las deducciones del período. Siempre se recalcula desde la
      // tabla `deduccion`: para descontar más, se CREA una deducción nueva,
      // nunca se sobrescribe este monto.
      deducciones: Generated<number>;
      deuda_total: Generated<number>;
      deuda_pendiente: Generated<number>;
      neto_pagar: Generated<number>;
      total_conduces: Generated<number>;
      // Conduces sin persona que se atribuyeron infiriendo por
      // `equipo.operador_id`. Si > 0 la UI debe marcar la fila: es una
      // suposición, no un dato duro.
      conduces_inferidos: Generated<number>;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   // Desglose por tarifa: un chofer puede tener varias tarifas distintas en un
   // mismo ciclo ("Arena - Viaje" 350, "Grava - Bote" 500).
   payroll_cycle_employee_tarifas: {
      id: Generated<string>;
      cycle_employee_id: string;
      categoria_equipo_tarifa_id: string | null; // best-effort (hard-replace)
      categoria_equipo_tarifa_nombre: string; // snapshot
      medida_cobro_nombre: string | null;
      cantidad: Generated<number>;
      monto_pago: Generated<number>; // precio unitario AL CHOFER
      subtotal: Generated<number>;
      created_at: Generated<Date>;
   };

   /*
      Precio escrito a mano para una tarifa que la nómina no puede resolver
      sola (el conduce guardó el nombre pero no el id, y ese nombre o no existe
      ya en el catálogo o corresponde a varias categorías).

      Aplica SOLO a ese empleado en ESE ciclo. Vive fuera de
      `payroll_cycle_employee_tarifas` porque ese snapshot se borra y reescribe
      en cada recálculo; aquí el precio sobrevive, que es el punto.

      Se indexa por nombre normalizado porque estas filas, por definición, no
      tienen `categoria_equipo_tarifa_id`.
   */
   payroll_cycle_precio_manual: {
      id: Generated<string>;
      cycle_id: string;
      empleado_id: string;
      tarifa_nombre_norm: string;
      tarifa_nombre: string;
      monto_pago: Generated<number>;
      nota: string | null;
      created_by: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   payroll_items: {
      id: Generated<string>;
      organization_id: string | null;
      cycle_id: string | null;
      employee_id: string;
      concept_id: string;
      source: string;
      source_ref_id: string | null;
      quantity: number;
      unit_value: number;
      amount: number;
      work_date: Date | null;
      work_date_end: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   tarea: {
      id: Generated<string>;
      proyecto_id: string | null;
      nombre: string;
      descripcion: string | null;
      estado: Generated<string>;
      fecha_inicio: Date | null;
      fecha_fin: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   notifications: {
      id: Generated<string>;
      user_id: string;
      title: string;
      message: string;
      type: string;
      reference_id: string | null;
      reference_type: string | null;
      is_read: Generated<boolean>;
      created_at: Generated<Date>;
      read_at: Date | null;
   };

   user_employee_link: {
      id: Generated<string>;
      user_id: string;
      empleado_id: string;
      created_at: Generated<Date>;
   };

   unidades: {
      id: Generated<string>;
      nombre: string;
      abreviatura: string;
      tipo_unidad: string;
      factor_a_base: number;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   }

   cita: {
      id: Generated<string>;
      referencia: Generated<number>;
      cliente_id: string | null;
      employee_id: string | null;
      fecha: Date;
      motivo: string | null;
      estado: string;
      notas: string | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   proyecto: {
      id: Generated<string>;
      referencia: Generated<number>; // se muestra como PRO-001 (ver proyecto.infraestructure)
      nombre: string;
      estado: string;       // 'BORRADOR' | 'COMPLETADO' | 'CANCELADO' | 'EN PROGRESO'
      cliente_id: string;
      tarifa_servicio: number | null;

      total_cobrable: Generated<number>;
      total_gasto_interno: Generated<number>;
      total_equipos: Generated<number>; // suma cacheada de conduces (arregla el bug del historial)
      rentabilidad: Generated<number>;

      notas: string | null;
      fecha_inicio: Date;
      fecha_fin: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   proyecto_detalle: {
      id: Generated<string>;
      proyecto_id: string;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
      es_cobrable: boolean;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   proyecto_asignacion: {
      id: Generated<string>;
      proyecto_id: string;
      empleado_id: string;
      equipo_id: string;
      horas_trabajadas: number;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   servicios: ServicioTable;
   servicio_tarifas: ServicioTarifaTable;
   conduce: ConduceTable; // ← NUEVO
   proyecto_tarifa: ProyectoTarifaTable; // ← NUEVO (tarifas propias del proyecto)
   // El viejo proyecto_tarifas (ligado a proyecto_equipos) y proyecto_equipos
   // se ELIMINARON — reemplazados por `conduce` + este `proyecto_tarifa`.

   categoria_gasto: {
      id: Generated<string>;
      nombre: string;
      grupo: string;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   }

   /**
    * Owned and migrated by Better Auth — declared here only so role
    * management can check which users hold a given role. Treat as read-only;
    * writes go through the Better Auth admin API.
    */
   user: {
      id: string;
      email: string;
      name: string;
      role: string | null;
   }

   /**
    * Runtime-editable roles. `permissions` is the `{ resource: action[] }`
    * map consumed by `ac.newRole()` — see `src/lib/permissions/resolve.ts`.
    */
   app_role: {
      key: string;
      label: string;
      description: string | null;
      permissions: Record<string, string[]>;
      is_builtin: Generated<boolean>;
      is_admin: Generated<boolean>;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   }

   gasto: {
      id: Generated<string>;
      referencia: Generated<number>;
      monto_total: number;
      concepto: string;
      ncf: string | null;
      categoria_gasto_id: string;
      orden_compra_id: string | null;
      proyecto_id: string | null;
      equipo_id: string | null;
      fecha: Date;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
      deleted_by: string | null;
      deleted_at: Date | null;
      deleted_reason: string | null;
   };

   costo: {
      id: Generated<string>;
      proyecto_id: string,
      monto_total: number,
      concepto: string,
      ncf: string | null;
      orden_compra_id: string | null;
      referencia: Generated<number>;
      fecha: Date;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
      deleted_by: string | null;
      deleted_at: Date | null;
      deleted_reason: string | null;
   };

   deduccion: {
      id: Generated<string>;
      empleado_id: string;
      equipo_id: string | null;
      gasto_id: string | null;
      monto_total: number;
      concepto: string;
      balance_pendiente: number | null;
      referencia: Generated<number>;
      fecha: Date;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
      deleted_by: string | null;
      deleted_at: Date | null;
      deleted_reason: string | null;
   };

   pago: {
      id: Generated<string>;
      referencia: Generated<number>;
      metodo_pago: string;
      monto_pagado: number;
      concepto: string;
      tipo_movimiento: string;
      gasto_empresa_id: string | null;
      costo_cliente_id: string | null;
      deduccion_empleado_id: string | null;
      proyecto_id: string | null;
      fecha: Date;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
      deleted_by: string | null;
      deleted_at: Date | null;
      deleted_reason: string | null;
   };
}

const db = new Kysely<DB>({
   dialect: new PostgresDialect({
      pool: new Pool({
         connectionString: process.env.DB_CONNECTION_STRING,
      }),
   }),
});

export default db;