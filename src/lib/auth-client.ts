import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { ac, roles } from "./permission";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    inferAdditionalFields<typeof auth>(),
  ],
});

export const { signIn, signUp, useSession } = authClient;
