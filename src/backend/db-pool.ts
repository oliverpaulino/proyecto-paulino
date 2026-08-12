import { parse as parseConnectionString } from "pg-connection-string";

const connectionString = process.env.DB_CONNECTION_STRING || process.env.DATABASE_URL || "";

if (!connectionString) {
   throw new Error("La variable de entorno de la base de datos no está definida.");
}

const parsed = parseConnectionString(connectionString);

// NO pasar `connectionString` a pg: cuando trae `sslmode=...`, pg lo usa e
// ignora la opción `ssl` del config (ConnectionParameters hace
// Object.assign({}, config, parse(connectionString)), así que la string pisa
// el ssl). Contra el pooler de Supabase eso termina en
// SELF_SIGNED_CERT_IN_CHAIN. Pasamos los campos por separado y controlamos
// SSL explícitamente.
export const poolConfig = {
   host: parsed.host ?? undefined,
   port: parsed.port ? Number(parsed.port) : undefined,
   database: parsed.database ?? undefined,
   user: parsed.user ?? undefined,
   password: parsed.password ?? undefined,
   ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
} as const;
