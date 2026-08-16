"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Link2, Loader2 } from "lucide-react";
import { useUserEmployeeLinkStore } from "@/stores/useUserEmployeeLinkStore";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { authClient } from "@/lib/auth-client";
import { UserEmployeeLinkTable } from "./user-employee-link-table";
import { UserEmployeeLinkForm } from "./user-employee-link-form";
import type { UserEmployeeLink } from "@/dtos/user-employee-link.dto";
import { toast } from "sonner";

interface UserRecord {
   id: string;
   name: string;
   email: string;
}

interface UserEmployeeLinkManagerProps {
   fixedUserId?: string;
}

export function UserEmployeeLinkManager({ fixedUserId }: UserEmployeeLinkManagerProps) {
   const { Links, GetLinks, GetLinksByUserId, CreateLink, DeleteLink } = useUserEmployeeLinkStore();
   const { Employees, GetEmployees } = useEmployeeStore();
   
   const [users, setUsers] = useState<UserRecord[]>([]);
   const [localLinks, setLocalLinks] = useState<UserEmployeeLink[]>([]);
   const [loadingData, setLoadingData] = useState(true);
   const [createOpen, setCreateOpen] = useState(false);
   const [formLoading, setFormLoading] = useState(false);
   
   const [linkToDelete, setLinkToDelete] = useState<UserEmployeeLink | null>(null);
   const [deletingLink, setDeletingLink] = useState(false);

   const fetchData = async () => {
      setLoadingData(true);
      try {
         const userRes = await (authClient.admin as any).listUsers({ query: { limit: 500 } });
         setUsers((userRes?.data?.users as UserRecord[]) || []);

         await GetEmployees({ limit: 1000, force: true });

         if (fixedUserId) {
            const res = await GetLinksByUserId(fixedUserId);
            setLocalLinks(res || []);
         } else {
            await GetLinks();
         }
      } catch (error) {
         toast.error("Error al cargar los datos");
      } finally {
         setLoadingData(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, [fixedUserId]);

   const currentLinks = fixedUserId ? localLinks : Links;

   async function handleCreate(data: { user_id: string; empleado_id: string }) {
      setFormLoading(true);
      const result = await CreateLink(data);
      setFormLoading(false);

      if (result instanceof Error) {
         toast.error(result.message);
      } else {
         toast.success("Vínculo creado exitosamente");
         setCreateOpen(false);
         if (fixedUserId) {
            const res = await GetLinksByUserId(fixedUserId);
            setLocalLinks(res || []);
         }
      }
   }

   async function confirmDeleteLink() {
      if (!linkToDelete) return;
      setDeletingLink(true);
      const result = await DeleteLink(linkToDelete.id);
      setDeletingLink(false);

      if (result instanceof Error) {
         toast.error(result.message);
      } else {
         toast.success("Vínculo eliminado");
         setLinkToDelete(null);
         if (fixedUserId) {
            const res = await GetLinksByUserId(fixedUserId);
            setLocalLinks(res || []);
         }
      }
   }

   return (
      <div className="flex flex-col gap-4">
         <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
               <Link2 className="h-5 w-5 text-muted-foreground" />
               <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {fixedUserId ? "Empleados Vinculados" : "Vínculos de Usuarios y Empleados"}
               </h2>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
               <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                     <Plus className="size-4 mr-1.5" />
                     Vincular
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                     <DialogTitle>Vincular Empleado</DialogTitle>
                     <DialogDescription>
                        Asocia un usuario del sistema con un perfil de empleado.
                     </DialogDescription>
                  </DialogHeader>
                  <UserEmployeeLinkForm
                     fixedUserId={fixedUserId}
                     onSubmit={handleCreate}
                     onCancel={() => setCreateOpen(false)}
                     loading={formLoading}
                  />
               </DialogContent>
            </Dialog>
         </div>

         {loadingData ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
               <Loader2 className="h-6 w-6 animate-spin" />
            </div>
         ) : (
            <UserEmployeeLinkTable
               links={currentLinks}
               users={users}
               employees={Employees}
               onDelete={setLinkToDelete}
               hideUserColumn={!!fixedUserId}
            />
         )}

         <Dialog open={!!linkToDelete} onOpenChange={(open) => { if (!open) setLinkToDelete(null); }}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Eliminar vínculo</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar este vínculo? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setLinkToDelete(null)} disabled={deletingLink}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={confirmDeleteLink} disabled={deletingLink}>
                     {deletingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     {deletingLink ? "Eliminando…" : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}