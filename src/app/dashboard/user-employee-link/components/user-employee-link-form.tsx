"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectBuscadorEmployee } from "@/components/shared/selectBuscadorEmployee";
import { SelectBuscadorUser } from "@/components/shared/selectBuscadorUser";

interface UserEmployeeLinkFormProps {
   fixedUserId?: string;
   onSubmit: (data: { user_id: string; empleado_id: string }) => Promise<void>;
   onCancel?: () => void;
   loading?: boolean;
}

export function UserEmployeeLinkForm({
   fixedUserId,
   onSubmit,
   onCancel,
   loading,
}: UserEmployeeLinkFormProps) {
   const [userId, setUserId] = useState<string | null>(fixedUserId || null);
   const [empleadoId, setEmpleadoId] = useState<string | null>(null);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!userId || !empleadoId) return;
      await onSubmit({ user_id: userId, empleado_id: empleadoId });
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
         {!fixedUserId && (
            <div className="flex flex-col gap-1.5">
               <Label>Usuario *</Label>
               <SelectBuscadorUser
                  value={userId}
                  onChange={setUserId}
                  disabled={loading}
               />
            </div>
         )}
         <div className="flex flex-col gap-1.5">
            <Label>Empleado (Sin vincular) *</Label>
            <SelectBuscadorEmployee
               value={empleadoId}
               onChange={setEmpleadoId}
               unlinkedOnly={true}
               disabled={loading}
            />
         </div>
         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading || !userId || !empleadoId}>
               {loading ? "Guardando…" : "Vincular"}
            </Button>
         </div>
      </form>
   );
}