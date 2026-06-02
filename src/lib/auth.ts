import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin, jwt } from "better-auth/plugins";
import { organization } from "better-auth/plugins";
import { Resend } from "resend";
import { ac, roles } from "./permission";
// const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,
  }),
  user: {
    additionalFields: {
      role: { type: "string", input: false },
    },
  },
  plugins: [
    organization(),
    jwt(),
    admin({
      ac,
      roles,
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
