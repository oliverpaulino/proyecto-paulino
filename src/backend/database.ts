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
  categories: {
    id: string;
    name: string;
    organization_id: string;
  };
  product: {
    id: string;
    category_id?: string;
    name: string;
    description?: string;
    is_active: boolean;
    organization_id: string;
  };
  product_variants: {
    id: string;
    product_id: string;
    sku: string;
    barcode?: string;
    attributes: Record<string, string>;
    price: number;
    is_active: boolean;
    organization_id: string;
  };
  stock_levels: {
    id: string;
    organization_id: string;
    variant_id: string;
    warehouse: string;
    quantity: number;
    min_stock: number;
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
