import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin, jwt } from "better-auth/plugins";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: new Pool({
    // connection options
    connectionString: process.env.DB_CONNECTION_STRING,
  }),
  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },
  plugins: [organization(), jwt(), admin()],
  emailAndPassword: {
    enabled: true,
  },
});
