"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
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
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
   ArrowLeft,
   AlertTriangle,
   User,
   Loader2,
   MoreHorizontal,
   Plus,
   Pencil,
   Trash2,
   DollarSign,
   Contact,
} from "lucide-react";
import type { EmployeeWarning } from "@/dtos/employee.dto";

const ROL_LABEL: Record<string, string> = {
   OPERADOR: "Operador",
   INGENIERO: "Ingeniero",
   MECANICO: "Mecánico",
   CONTABLE: "Contable",
   MENSAJERO: "Mensajero",
};

export default function EmployeeDetailPage() {
   const params = useParams();
   const router = useRouter();
   const empleadoId = params.id as string;

   const { selectedEmployee, loading, GetEmployeeDetails, CreateWarning, UpdateWarning, DeleteWarning } =
      useEmployeeStore();

   const [createWarningOpen, setCreateWarningOpen] = useState(false);
   const [editWarning, setEditWarning] = useState<EmployeeWarning | null>(null);
   const [deleteWarning, setDeleteWarning] = useState<EmployeeWarning | null>(null);
   const [actionLoading, setActionLoading] = useState(false);

   const [warningForm, setWarningForm] = useState({
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
      monto_descuento: 0,
   });

   useEffect(() => {
      GetEmployeeDetails(empleadoId);
   }, [empleadoId, GetEmployeeDetails]);

   function resetWarningForm() {
      setWarningForm({
         fecha: new Date().toISOString().split("T")[0],
         descripcion: "",
         monto_descuento: 0,
      });
   }

   async function handleCreateWarning() {
      if (!warningForm.descripcion.trim()) return;
      setActionLoading(true);
      try {
         await CreateWarning({
            empleado_id: empleadoId,
            fecha: new Date(warningForm.fecha),
            descripcion: warningForm.descripcion,
            monto_descuento: warningForm.monto_descuento,
         });
         setCreateWarningOpen(false);
         resetWarningForm();
      } finally {
         setActionLoading(false);
      }
   }

   async function handleEditWarning() {
      if (!editWarning || !warningForm.descripcion.trim()) return;
      setActionLoading(true);
      try {
         await UpdateWarning(editWarning.id, {
            fecha: new Date(warningForm.fecha),
            descripcion: warningForm.descripcion,
            monto_descuento: warningForm.monto_descuento,
         });
         setEditWarning(null);
         resetWarningForm();
      } finally {
         setActionLoading(false);
      }
   }

   async function handleDeleteWarning() {
      if (!deleteWarning) return;
      setActionLoading(true);
      try {
         await DeleteWarning(empleadoId, deleteWarning.id);
         setDeleteWarning(null);
      } finally {
         setActionLoading(false);
      }
   }

   function openEditWarning(w: EmployeeWarning) {
      setEditWarning(w);
      setWarningForm({
         fecha: new Date(w.fecha).toISOString().split("T")[0],
         descripcion: w.descripcion,
         monto_descuento: w.monto_descuento,
      });
   }

   if (loading && !selectedEmployee) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-brand-blue" />
         </div>
      );
   }

   if (!selectedEmployee) {
      return (
         <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
            <User className="size-12 opacity-30" />
            <p>Empleado no encontrado.</p>
            <Button variant="outline" onClick={() => router.push("/dashboard/empleados")}>
               <ArrowLeft className="size-4 mr-2" /> Volver
            </Button>
         </div>
      );
   }

   const { empleado, amonestaciones } = selectedEmployee;
   const totalDescuentos = amonestaciones.reduce((sum, a) => sum + a.monto_descuento, 0);

   return (
      <div className="flex flex-col gap-6 p-6">
         {/* Header */}
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/empleados")}>
               <ArrowLeft className="size-4" />
            </Button>
            <div>
               <h1 className="text-2xl font-bold text-brand-blue dark:text-white">{empleado.nombre}</h1>
               <p className="text-sm text-muted-foreground">
                  {empleado.tipo_identificacion}: {empleado.identificacion} · {ROL_LABEL[empleado.rol] ?? empleado.rol}
               </p>
            </div>
            <div className="ml-auto flex gap-2">
               <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/empleados/${empleadoId}/contacts`)}
               >
                  <Contact className="size-4 mr-2" />
                  Contactos
               </Button>
            </div>
         </div>

         {/* Info cards */}
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
               <CardHeader className="pb-2">
                  <CardDescription>Salario</CardDescription>
                  <CardTitle className="text-2xl">
                     RD$ {empleado.salario.toLocaleString("es-DO")}
                  </CardTitle>
               </CardHeader>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardDescription>Total Descuentos por Amonestaciones</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                     RD$ {totalDescuentos.toLocaleString("es-DO")}
                  </CardTitle>
               </CardHeader>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardDescription>Amonestaciones registradas</CardDescription>
                  <CardTitle className="text-2xl">{amonestaciones.length}</CardTitle>
               </CardHeader>
            </Card>
         </div>

         {/* Amonestaciones */}
         <Card>
            <CardHeader>
               <div className="flex items-center justify-between">
                  <div>
                     <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-destructive" />
                        Amonestaciones
                     </CardTitle>
                     <CardDescription>Historial de amonestaciones y descuentos aplicados</CardDescription>
                  </div>
                  <Button
                     size="sm"
                     onClick={() => { resetWarningForm(); setCreateWarningOpen(true); }}
                  >
                     <Plus className="size-4 mr-2" />
                     Nueva
                  </Button>
               </div>
            </CardHeader>
            <CardContent>
               {amonestaciones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                     <AlertTriangle className="size-8 opacity-30" />
                     <p className="text-sm">Sin amonestaciones registradas.</p>
                  </div>
               ) : (
                  <Table>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Fecha</TableHead>
                           <TableHead>Descripción</TableHead>
                           <TableHead>Descuento</TableHead>
                           <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {amonestaciones.map((w) => (
                           <TableRow key={w.id}>
                              <TableCell className="whitespace-nowrap">
                                 {new Date(w.fecha).toLocaleDateString("es-DO")}
                              </TableCell>
                              <TableCell>{w.descripcion}</TableCell>
                              <TableCell className="text-destructive font-semibold">
                                 <span className="flex items-center gap-1">
                                    <DollarSign className="size-3.5" />
                                    {w.monto_descuento.toLocaleString("es-DO")}
                                 </span>
                              </TableCell>
                              <TableCell>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="size-4" />
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                       <DropdownMenuItem onClick={() => openEditWarning(w)}>
                                          <Pencil className="size-4 mr-2" /> Editar
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => setDeleteWarning(w)}
                                       >
                                          <Trash2 className="size-4 mr-2" /> Eliminar
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               )}
            </CardContent>
         </Card>

         {/* Create Warning Dialog */}
         <Dialog open={createWarningOpen} onOpenChange={(open) => { setCreateWarningOpen(open); if (!open) resetWarningForm(); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Nueva Amonestación</DialogTitle>
                  <DialogDescription>Registra una amonestación para {empleado.nombre}.</DialogDescription>
               </DialogHeader>
               <WarningFormFields form={warningForm} onChange={setWarningForm} />
               <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateWarningOpen(false)} disabled={actionLoading}>
                     Cancelar
                  </Button>
                  <Button onClick={handleCreateWarning} disabled={actionLoading || !warningForm.descripcion.trim()}>
                     {actionLoading ? "Guardando…" : "Registrar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Edit Warning Dialog */}
         <Dialog open={!!editWarning} onOpenChange={(open) => { if (!open) { setEditWarning(null); resetWarningForm(); } }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Editar Amonestación</DialogTitle>
               </DialogHeader>
               <WarningFormFields form={warningForm} onChange={setWarningForm} />
               <DialogFooter>
                  <Button variant="outline" onClick={() => setEditWarning(null)} disabled={actionLoading}>
                     Cancelar
                  </Button>
                  <Button onClick={handleEditWarning} disabled={actionLoading || !warningForm.descripcion.trim()}>
                     {actionLoading ? "Guardando…" : "Guardar cambios"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         {/* Delete Warning Dialog */}
         <Dialog open={!!deleteWarning} onOpenChange={(open) => { if (!open) setDeleteWarning(null); }}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Eliminar Amonestación</DialogTitle>
                  <DialogDescription>
                     ¿Estás seguro de que deseas eliminar esta amonestación? Esta acción no se puede deshacer.
                  </DialogDescription>
               </DialogHeader>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteWarning(null)} disabled={actionLoading}>
                     Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteWarning} disabled={actionLoading}>
                     {actionLoading ? "Eliminando…" : "Eliminar"}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function WarningFormFields({
   form,
   onChange,
}: {
   form: { fecha: string; descripcion: string; monto_descuento: number };
   onChange: (v: typeof form) => void;
}) {
   return (
      <div className="flex flex-col gap-3 py-2">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-fecha">Fecha *</Label>
            <Input
               id="wf-fecha"
               type="date"
               value={form.fecha}
               onChange={(e) => onChange({ ...form, fecha: e.target.value })}
               required
            />
         </div>
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-desc">Descripción *</Label>
            <Input
               id="wf-desc"
               value={form.descripcion}
               onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
               placeholder="Motivo de la amonestación"
               required
            />
         </div>
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-monto">Monto descuento (RD$)</Label>
            <Input
               id="wf-monto"
               type="number"
               min={0}
               step={0.01}
               value={form.monto_descuento}
               onChange={(e) => onChange({ ...form, monto_descuento: Number(e.target.value) })}
               placeholder="0.00"
            />
         </div>
      </div>
   );
}
