import { Kysely, PostgresDialect, Generated } from "kysely";
import { Pool } from "pg";

export interface DB {
   cliente: {
      id: Generated<string>;
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

   equipo: {
      id: Generated<string>;
      nombre: string;
      tipo: string;
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
   };

   purchase_order_approvers: {
      user_id: string;
      user_name: string;
      granted_by: string;
      granted_at: Generated<Date>;
   };

   orden_compra_item: {
      id: Generated<string>;
      orden_compra_id: string;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
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

   // Read-only minimal view of proyecto (the full module lives elsewhere/TBD).
   // Only the columns the tareas feature needs are typed here.
   proyecto: {
      id: Generated<string>;
      nombre: string;
   };

   tarea: {
      id: Generated<string>;
      proyecto_id: string;
      nombre: string;
      descripcion: string | null;
      estado: Generated<string>; // estado_tarea enum, cast at runtime
      fecha_inicio: Date | null;
      fecha_fin: Date | null;
      created_at: Generated<Date>;
      updated_at: Generated<Date>;
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
