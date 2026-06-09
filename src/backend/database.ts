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
      tipo_contacto: string;
      contacto: string;
      created_at: Date;
      updated_at: Date;
   };

   operador: {
      id: Generated<string>;
      empleado_id: string | null;
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

   tipo_item: {
      id: Generated<string>;
      nombre: string;
      descripcion: string | null;
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
}

const db = new Kysely<DB>({
   dialect: new PostgresDialect({
      pool: new Pool({
         connectionString: process.env.DB_CONNECTION_STRING,
      }),
   }),
});

export default db;
