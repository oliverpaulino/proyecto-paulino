import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin, jwt, customSession } from "better-auth/plugins";
import { Resend } from "resend";
import { ac, roles } from "./permission";
import { getPermissionsForRole } from "./permissions/resolve";

// const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Instancia del Pool con SSL obligatorio en producción para Supabase
const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING || process.env.DATABASE_URL,
  max: 10,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: pool,

  // 2. Manejo de orígenes mediante arreglo seguro para evitar errores de tipos y CORS
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
    "https://*.vercel.app", // Soporte nativo de comodines si tu versión de better-auth lo permite
    "http://localhost:3000"
  ].filter(Boolean),

  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },

  plugins: [
    jwt(),
    admin({
      // `administrador` is seeded as a protected built-in role and cannot be
      // deleted, so this stays a safe static anchor for the admin plugin's own
      // capabilities. Application-level access is resolved from `app_role`.
      adminRoles: ["administrador"],
      ac,
      roles,
    }),
    // Ships the role's effective permission map with the session so the client
    // never has to resolve permissions from the statically bundled role table —
    // which is what made custom roles impossible before.
    customSession(async ({ user, session }) => {
      const role = (user as { role?: string | null }).role ?? null;
      return {
        user,
        session,
        permissions: await getPermissionsForRole(role),
      };
    }),
  ],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes, refreshed on each request
    },
  },

  emailAndPassword: {
    enabled: true,
    // sendResetPassword: async ({ user, url }) => {
    //   void resend.emails.send({
    //     from: "Support <noreply@support.forma.com.do>",
    //     to: user.email,
    //     subject: "Restablecer tu contraseña",
    //     html: `
    //       <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
    //         <h2 style="margin-bottom:8px">Restablecer contraseña</h2>
    //         <p style="color:#555;margin-bottom:24px">Haz clic en el botón para crear una nueva contraseña. El enlace expira en 1 hora.</p>
    //         <a href="${url}" style="display:inline-block;background:#0057d6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
    //           Restablecer contraseña
    //         </a>
    //         <p style="color:#999;font-size:12px;margin-top:24px">Si no solicitaste esto, ignora este correo.</p>
    //       </div>
    //     `,
    //   });
    // },
  },
});