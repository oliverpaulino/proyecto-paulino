"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Shield, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { PermissionGuard } from "@/components/permission-guard";

interface Approver {
   user_id: string;
   user_name: string;
   granted_by: string;
   granted_at: string;
}

interface UserRecord {
   id: string;
   name: string;
   email: string;
   role?: string;
}

export default function AprobadoresPage() {
   const router = useRouter();
   const { data: session } = useSession();
   const currentUser = session?.user as ({ id: string; name: string; email: string; role?: string }) | undefined;
   const role = currentUser?.role;

   const [approvers, setApprovers] = useState<Approver[]>([]);
   const [users, setUsers] = useState<UserRecord[]>([]);
   const [usersError, setUsersError] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [addOpen, setAddOpen] = useState(false);
   const [saving, setSaving] = useState(false);
   const [selectedUserId, setSelectedUserId] = useState("");
   const [error, setError] = useState<string | null>(null);

   const loadApprovers = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/purchase-orders/approvers");
         if (res.ok) {
            setApprovers(await res.json() as Approver[]);
         }
      } finally {
         setLoading(false);
      }
   }, []);

   const loadUsers = useCallback(async () => {
      setUsersError(null);
      try {
         const res = await authClient.admin.listUsers({ query: { limit: 200 } });
         if (res.data?.users) {
            setUsers(
               res.data.users.map((u) => ({
                  id: u.id,
                  name: u.name ?? u.email,
                  email: u.email,
                  role: (u as { role?: string }).role,
               }))
            );
         } else {
            setUsersError("No se pudo cargar la lista de usuarios.");
         }
      } catch {
         setUsersError("Error al cargar usuarios. Intenta de nuevo.");
      }
   }, []);

   useEffect(() => {
      if (role === "administrador") {
         loadApprovers();
         loadUsers();
      } else {
         setLoading(false);
      }
   }, [role, loadApprovers, loadUsers]);

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (role !== "administrador") {
      return (
         <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
            <Shield className="size-12 opacity-30" />
            <p>Solo los administradores pueden gestionar los aprobadores.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/compras")}>
               <ArrowLeft className="mr-2 size-4" /> Volver
            </Button>
         </div>
      );
   }

   const approverIds = new Set(approvers.map((a) => a.user_id));
   const eligibleUsers = users.filter((u) => !approverIds.has(u.id));

   // Always include the current admin if they're not already an approver
   const currentAdminEligible =
      currentUser && !approverIds.has(currentUser.id)
         ? { id: currentUser.id, name: currentUser.name ?? currentUser.email, email: currentUser.email }
         : null;

   const dropdownUsers = eligibleUsers.length > 0
      ? eligibleUsers
      : currentAdminEligible
        ? [currentAdminEligible as UserRecord]
        : [];

   async function handleAdd() {
      if (!selectedUserId) return;
      const user = dropdownUsers.find((u) => u.id === selectedUserId);
      if (!user) return;
      setSaving(true);
      setError(null);
      try {
         const res = await fetch("/api/purchase-orders/approvers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, user_name: user.name }),
         });
         const data = await res.json() as { error?: string };
         if (!res.ok) throw new Error(data.error ?? "Error al agregar aprobador");
         setAddOpen(false);
         setSelectedUserId("");
         await loadApprovers();
      } catch (err) {
         setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
         setSaving(false);
      }
   }

   async function handleAddSelf() {
      if (!currentUser || approverIds.has(currentUser.id)) return;
      setSaving(true);
      setError(null);
      try {
         const res = await fetch("/api/purchase-orders/approvers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               user_id: currentUser.id,
               user_name: currentUser.name ?? currentUser.email,
            }),
         });
         const data = await res.json() as { error?: string };
         if (!res.ok) throw new Error(data.error ?? "Error");
         await loadApprovers();
      } catch (err) {
         setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
         setSaving(false);
      }
   }

   async function handleRemove(userId: string) {
      try {
         await fetch(`/api/purchase-orders/approvers/${userId}`, { method: "DELETE" });
         await loadApprovers();
      } catch {
         // ignore
      }
   }

   const isSelfApprover = currentUser && approverIds.has(currentUser.id);

   return (
      <PermissionGuard resource="material_request" action="read" mode="page">
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div>
            <div className="flex items-center gap-3">
               <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/dashboard/compras")}
               >
                  <ArrowLeft className="size-4" />
               </Button>
               <Shield className="size-7 text-brand-blue dark:text-blue-400" />
               <h1 className="text-3xl font-bold text-brand-blue dark:text-white tracking-tight">
                  Aprobadores de Órdenes
               </h1>
            </div>
            <p className="mt-1.5 ml-24 text-sm text-muted-foreground">
               Usuarios autorizados para firmar y aprobar órdenes de compra
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-brand-blue via-brand-yellow/50 to-transparent" />
         </div>

         {/* Quick-add self card */}
         {!isSelfApprover && (
            <div className="flex items-center justify-between rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 px-5 py-4">
               <div>
                  <p className="text-sm font-semibold text-brand-black dark:text-yellow-200">
                     ¿Quieres ser firmante tú mismo?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                     Agrégarte como primer firmante con un solo clic.
                  </p>
               </div>
               <Button
                  className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold"
                  onClick={handleAddSelf}
                  disabled={saving}
               >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Agregarme como firmante"}
               </Button>
            </div>
         )}

         {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
               {error}
            </p>
         )}

         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <div>
                  <CardTitle>Firmantes autorizados</CardTitle>
                  <CardDescription>
                     Solo estos usuarios pueden cambiar una orden a estado &quot;Aprobada&quot;.
                  </CardDescription>
               </div>
               <PermissionGuard resource="material_request" action="create">
               <Button
                  className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold"
                  onClick={() => { setAddOpen(true); setError(null); }}
               >
                  <UserPlus className="mr-2 size-4" />
                  Agregar firmante
               </Button>
               </PermissionGuard>
            </CardHeader>
            <CardContent className="p-0">
               {approvers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-10 text-muted-foreground">
                     <Shield className="size-10 opacity-20" />
                     <p className="text-sm">No hay firmantes registrados aún.</p>
                  </div>
               ) : (
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-muted/40 border-b border-border">
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Nombre
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Designado el
                           </th>
                           <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Acciones
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {approvers.map((a) => (
                           <tr key={a.user_id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">
                                 {a.user_name}
                                 {currentUser?.id === a.user_id && (
                                    <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                                 )}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                 {new Date(a.granted_at).toLocaleDateString("es-DO")}
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <PermissionGuard resource="material_request" action="delete">
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleRemove(a.user_id)}
                                 >
                                    <Trash2 className="size-4" />
                                 </Button>
                                 </PermissionGuard>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               )}
            </CardContent>
         </Card>

         {/* Add approver dialog */}
         <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setSelectedUserId(""); } }}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Agregar firmante autorizado</DialogTitle>
                  <DialogDescription>
                     Selecciona el usuario que tendrá permiso para aprobar órdenes de compra.
                  </DialogDescription>
               </DialogHeader>
               <div className="flex flex-col gap-4 pt-2">
                  {usersError ? (
                     <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                        {usersError}
                        <button
                           className="ml-2 underline"
                           onClick={loadUsers}
                        >
                           Reintentar
                        </button>
                     </div>
                  ) : dropdownUsers.length === 0 ? (
                     <p className="text-sm text-muted-foreground">
                        Todos los usuarios ya son firmantes, o no hay usuarios disponibles.
                     </p>
                  ) : (
                     <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                     >
                        <option value="">-- Selecciona un usuario --</option>
                        {dropdownUsers.map((u) => (
                           <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                           </option>
                        ))}
                     </select>
                  )}
                  {error && (
                     <p className="text-sm text-destructive">{error}</p>
                  )}
                  <div className="flex justify-end gap-2">
                     <Button variant="outline" onClick={() => setAddOpen(false)}>
                        Cancelar
                     </Button>
                     <Button
                        className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold"
                        onClick={handleAdd}
                        disabled={!selectedUserId || saving || dropdownUsers.length === 0}
                     >
                        {saving ? (
                           <><Loader2 className="mr-2 size-4 animate-spin" /> Guardando…</>
                        ) : (
                           "Agregar"
                        )}
                     </Button>
                  </div>
               </div>
            </DialogContent>
         </Dialog>
      </div>
      </PermissionGuard>
   );
}
