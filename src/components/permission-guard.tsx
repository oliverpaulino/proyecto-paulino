"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import type { Action, Resource } from "@/hooks/permissions.types";

/**
 * How the guard renders while loading and when access is denied.
 *
 * - `inline` (default) renders nothing in both cases. Correct for anything
 *   nested inside other UI — a button in a table cell, an item in a dropdown
 *   menu — where injecting a panel or a skeleton would break the layout.
 * - `page` renders a loading skeleton and a full "Acceso Restringido" panel.
 *   Use it for the wrapper around an entire route.
 */
type PermissionGuardMode = "inline" | "page";

interface PermissionGuardProps {
   resource: Resource;
   action: Action | Action[];
   children: ReactNode;
   /** Defaults to `inline`, which is safe to nest anywhere. */
   mode?: PermissionGuardMode;
   /** Rendered instead of `children` when access is denied. */
   fallback?: ReactNode;
}

export function PermissionGuard({
   resource,
   action,
   children,
   mode = "inline",
   fallback,
}: PermissionGuardProps) {
   const { canPerform, isLoading } = usePermissions({ resource, action });

   if (isLoading) {
      // An inline guard must not reserve space: a skeleton inside a table cell
      // or dropdown shifts every row while the session resolves.
      if (mode !== "page") return null;

      return (
         <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-96 w-full rounded-xl" />
         </div>
      );
   }

   if (!canPerform) {
      if (fallback !== undefined) return <>{fallback}</>;

      // Hiding the control is the right denial for inline use. The API rejects
      // the call regardless, so this is presentation only.
      if (mode !== "page") return null;

      return (
         <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
               <div className="rounded-full bg-muted p-4">
                  <Lock className="h-8 w-8 text-muted-foreground" />
               </div>
               <h2 className="text-xl font-semibold tracking-tight">Acceso Restringido</h2>
               <p className="text-sm text-muted-foreground">
                  No tienes permisos para acceder a esta sección. Contacta al administrador si crees que es un error.
               </p>
            </div>
         </div>
      );
   }

   return <>{children}</>;
}

export type { Action, Resource, PermissionGuardMode };
