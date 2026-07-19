"use client";

import { UserEmployeeLinkManager } from "@/app/dashboard/user-employee-link/components/user-employee-link-manager";
import { Link2 } from "lucide-react";

export default function UserEmployeeLinksPage() {
   return (
      <div className="flex flex-col gap-6 p-6 w-full max-w-5xl mx-auto">
         <div>
            <div className="flex items-center gap-3">
               <div className="h-9 w-1.5 rounded-full bg-blue-500" />
               <Link2 className="size-7 text-blue-500" />
               <h1 className="text-3xl font-bold tracking-tight">
                  Vínculos de Usuarios
               </h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
               Gestiona qué empleados están vinculados a qué usuarios del sistema.
            </p>
            <div className="mt-4 h-px bg-border" />
         </div>

         <UserEmployeeLinkManager />
      </div>
   );
}