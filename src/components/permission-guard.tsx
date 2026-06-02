"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

type Resource =
   | "project"
   | "product"
   | "sale"
   | "category"
   | "service"
   | "user"
   | "supplier"
   | "organization"
   | "bu"
   | "finances"
   | "invoice"
   | "ac"
   | "features"
   | "users"
   | "taxOrgProfiles"
   | "material_request"
   | "payment_request";

type Action =
   | "create"
   | "read"
   | "update"
   | "delete"
   | "share"
   | "discount"
   | "margin"
   | "approve"
   | "manage"
   | "view"
   | "add"
   | "readAll"
   | "readOwn";

interface PermissionGuardProps {
   resource: Resource;
   action: Action | Action[];
   children: ReactNode;
}

export function PermissionGuard({ resource, action, children }: PermissionGuardProps) {
   const { canPerform, isLoading } = usePermissions({ resource, action });

   if (isLoading) {
      return (
         <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-96 w-full rounded-xl" />
         </div>
      );
   }

   if (!canPerform) {
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

export type { Action, Resource };
