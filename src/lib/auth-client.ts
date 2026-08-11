import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  customSessionClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { ac, roles } from "./permission";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
    customSessionClient<typeof auth>(),
  ],
  // Usamos una variable pública o dejamos que asuma el dominio actual
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { signIn, signUp, useSession } = authClient;