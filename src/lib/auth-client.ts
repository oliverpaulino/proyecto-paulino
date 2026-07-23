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
    // Types the `permissions` map that `customSession` attaches server-side,
    // so `useSession().data.permissions` is available to `usePermissions`.
    customSessionClient<typeof auth>(),
  ],
});

export const { signIn, signUp, useSession } = authClient;
