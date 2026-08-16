"use client";

import { useSession } from "@/lib/auth-client";

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
   client: ["client"],
   machinery: ["machinery"],
   task: ["task"],
   appointment: ["appointment"],
   payroll: ["payroll"],
   account_payable: ["account_payable"],
   account_receivable: ["account_receivable"],
   payment: ["payment"],
   expense: ["expense"],
   warning: ["warning"],
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

/** `{ resource: action[] }`, delivered with the session by `customSession`. */
type PermissionMap = Record<string, string[]>;

/**
 * Reads the effective permission map off the session.
 *
 * Roles live in the `app_role` table and are resolved server-side, so this no
 * longer calls `authClient.admin.checkRolePermission`: that helper resolves
 * against the statically bundled role table and so returns `false` for every
 * custom role, which is what made dynamic roles impossible.
 */
export function useSessionPermissions() {
   const sessionQuery = useSession() as {
      data?: { permissions?: PermissionMap | null } | null;
      isPending?: boolean;
      isLoading?: boolean;
   };

   const isLoading = Boolean(sessionQuery.isPending ?? sessionQuery.isLoading);

   return {
      permissions: sessionQuery.data?.permissions ?? null,
      isLoading,
   };
}

export function usePermissions({ resource, action }: { resource: Resource; action: Action | Action[] }) {
   const { permissions, isLoading } = useSessionPermissions();

   if (isLoading || !permissions) {
      return { canPerform: false, isLoading };
   }

   const actions = Array.isArray(action) ? action : [action];
   const mappedResources = RESOURCE_MAP[resource] ?? [resource];

   // Each logical action (e.g. "read") expands to several physical actions
   // (["read","view","list","consult"]). The expansion is a set of
   // alternatives, not a conjunction: the user "can read" if their role grants
   // ANY of the physical read actions on ANY of the mapped resources.
   const canPerform = mappedResources.some((mappedResource) =>
      actions.some((logicalAction) =>
         ACTION_MAP[logicalAction].some(
            (physicalAction) =>
               permissions[mappedResource]?.includes(physicalAction) ?? false,
         ),
      ),
   );

   return { canPerform, isLoading: false };
}
