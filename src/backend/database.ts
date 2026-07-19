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

export interface ProyectoTarifaTable {
   id: Generated<string>;
   proyecto_id: string;
   categoria_equipo_id: string;
   precio_acordado: number;
   cobra_en_snapshot: string | null;
   cobra_minimo_snapshot: number | null;
   created_at: Generated<Date>;
}

export interface ProyectoEquipoTable {
   id: Generated<string>;
   proyecto_id: string;
   equipo_id: string;
   operador_id: string | null;
   proyecto_tarifa_id: string; // <-- El enlace crucial a la tarifa (Snapshot)
   cantidad: number;
   es_cobrable: boolean;
   created_at: Generated<Date>;
   updated_at: Generated<Date>;
}

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
      rol: string;
      salario: number;
      activo: boolean;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

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
      // numeric(12,2): the pg driver returns this as a string at runtime; the
      // repository normalizes it to a number. DB has a default of 0 (not generated).
      precio_base: number;
   };

   medida_cobro: {
      id: Generated<string>;
      nombre: string;
      descripcion: string | null; // <-- Importante: aquí también debe ser null
      permite_decimales: Generated<boolean>;
      is_active: Generated<boolean>;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   }

   categoria_equipo: {
      id: Generated<string>;
      nombre: string;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
   };

   categoria_equipo_tarifa: {
      id: Generated<string>;
      nombre: string;
      categoria_equipo_id: string;
      medida_cobro_id: string;      // Enlaza con 'Bote' o 'Viaje'
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
      estado: Generated<string>; // estado_tarea enum, cast at runtime
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
      tipo_proyecto: string; // 'EXPRESS' | 'NORMAL' | 'GRANDE'
      nombre: string;
      estado: string;       // 'BORRADOR' | 'COMPLETADO' | 'CANCELADO' | 'EN PROGRESO'
      cliente_id: string;
      servicio_id: string | null;
      tipo_servicio_snapshot: string | null;
      tipo_servicio_id: string | null;
      tarifa_servicio: number | null;

      total_cobrable: Generated<number>;
      total_gasto_interno: Generated<number>;
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
   proyecto_tarifas: ProyectoTarifaTable;
   proyecto_equipos: ProyectoEquipoTable;
}

const db = new Kysely<DB>({
   dialect: new PostgresDialect({
      pool: new Pool({
         connectionString: process.env.DB_CONNECTION_STRING,
      }),
   }),
});

export default db;
