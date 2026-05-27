import { Kysely, PostgresDialect, Generated } from "kysely";
import { Pool } from "pg";

// DB SCHEMA
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
    id: string;
    user_id: string | null;
    nombre: string;
    identificacion: string;
    tipo_identificacion: string;
    rolEmpleado: string;
    email: string | null;
    telefono: string | null;
    salario: number;
    activo: boolean;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  }

  operador: {
     id: string;
     empleado_id: string | null;
     licencia: string;
     created_at: Generated<Date>;
     updated_at: Generated<Date>;
  }

  amonestacion: {
    id: string;
    empleado_id: string | null;
    fecha: Date;
    descripcion: string;
    monto_descuento: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  }
}

// Initialize the database connection
const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DB_CONNECTION_STRING,
    }),
  }),
});



export default db;
