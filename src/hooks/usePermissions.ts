"use client";

import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";

import type { Action, Resource } from "./permissions.types";

const RESOURCE_MAP: Record<Resource, readonly string[]> = {
   project: ["project"],
   product: ["product"],
   sale: ["quotation", "invoice"],
   category: ["category"],
   service: ["service"],
   user: ["user"],
   supplier: ["supplier"],
   organization: ["organization"],
   bu: ["organization"],
   finances: ["invoice", "account_payable", "account_receivable", "payment", "expense", "quotation", "purchase_order"],
   invoice: ["invoice"],
   ac: ["ac", "account_payable", "account_receivable"],
   features: ["notification", "authentication"],
   users: ["employee"],
   taxOrgProfiles: ["organization"],
   material_request: ["purchase_order", "goods_receipt", "inventory"],
   payment_request: ["payment", "account_payable"],
};

const ACTION_MAP: Record<Action, readonly string[]> = {
   create: ["create"],
   read: ["read", "view", "list", "consult"],
   update: ["update", "manage"],
   delete: ["delete", "manage"],
   share: ["manage"],
   discount: ["discount"],
   margin: ["manage"],
   approve: ["manage"],
   manage: ["manage"],
   view: ["view", "read"],
   add: ["create"],
   readAll: ["read", "list"],
   readOwn: ["read"],
};

export function usePermissions({ resource, action }: { resource: Resource; action: Action | Action[] }) {
   const sessionQuery = useSession() as {
      data?: { user?: { role?: string | null } | null };
      isPending?: boolean;
      isLoading?: boolean;
   };

   const role = sessionQuery.data?.user?.role ?? "";
   const isLoading = Boolean(sessionQuery.isPending ?? sessionQuery.isLoading);

   if (isLoading || !role) {
      return { canPerform: false, isLoading: true };
   }

   const actions = Array.isArray(action) ? action : [action];
   const mappedResources = RESOURCE_MAP[resource] ?? [resource];
   const canPerform = mappedResources.some((mappedResource) =>
      authClient.admin.checkRolePermission({
         role: role as "usuario" | "asistente" | "coordinador" | "contable" | "administrador",
         permissions: {
            [mappedResource]: actions.flatMap((item) => ACTION_MAP[item]),
         },
      }),
   );

   return { canPerform, isLoading: false };
}