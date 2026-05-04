import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// DB SCHEMA
interface DB {
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
