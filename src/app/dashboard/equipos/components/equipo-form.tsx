"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import {
   ESTADOS_EQUIPO,
   type Equipo,
   type EstadoEquipo,
} from "@/dtos/equipo.dto";
import { ESTADO_LABEL } from "./equipo-labels";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { SelectBuscadorOperator } from "@/components/select-operator";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { CategoriaEquipoManager } from "./categoria-equipo-manager";

export interface EquipoFormValues {
   nombre: string;
   categoria_id: string;
   operador_id?: string;
   estado: EstadoEquipo;
   placa: string;
   modelo: string;
   ano: string;
}

interface EquipoFormProps {
   initialData?: Partial<Equipo>;
   onSubmit: (data: EquipoFormValues) => Promise<void>;
   onCancel?: () => void;
   onManageCategorias?: () => void;
   loading?: boolean;
   submitLabel?: string;
}

const SELECT_CLASS =
   "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 text-foreground";

export function EquipoForm({
   initialData,
   onSubmit,
   onCancel,
   onManageCategorias,
   loading,
   submitLabel = "Crear equipo",
}: EquipoFormProps) {
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();
   const { GetOperators } = useEmployeeStore();
   const [manageOpen, setManageOpen] = useState(false);


   const [values, setValues] = useState<EquipoFormValues>({
      nombre: initialData?.nombre ?? "",
      categoria_id: initialData?.categoria_id ?? "",
      operador_id: initialData?.operador_id ?? undefined,
      estado: initialData?.estado ?? "ACTIVO",
      placa: initialData?.placa ?? "",
      modelo: initialData?.modelo ?? "",
      ano: initialData?.ano != null ? String(initialData.ano) : "",
   });
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      GetCategoriaEquipos();
      GetOperators({ search: "", limit: 20, force: true });
   }, [GetCategoriaEquipos]);

   // Cuando cargan las categorías y no hay una seleccionada, pre-seleccionar la primera.
   useEffect(() => {
      if (!values.categoria_id && CategoriaEquipos.length > 0) {
         setValues((prev) => ({ ...prev, categoria_id: CategoriaEquipos[0].id }));
      }
   }, [CategoriaEquipos, values.categoria_id]);

   function set<K extends keyof EquipoFormValues>(field: K, value: EquipoFormValues[K]) {
      setValues((prev) => ({ ...prev, [field]: value }));
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (!values.categoria_id) {
         setError("Selecciona una categoría");
         return;
      }
      try {
         await onSubmit(values);
      } catch (err: unknown) {
         setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
   }

   const selectedCat = CategoriaEquipos.find((c) => c.id === values.categoria_id);

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-nombre">Nombre *</Label>
            <Input
               id="ef-nombre"
               value={values.nombre}
               onChange={(e) => set("nombre", e.target.value)}
               placeholder="ej. Excavadora CAT 320"
               required
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
               <Label htmlFor="ef-categoria">Categoría *</Label>
               <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
               >
                  <Settings2 className="size-3" />
                  Gestionar categorías
               </button>
            </div>
            <select
               id="ef-categoria"
               value={values.categoria_id}
               onChange={(e) => set("categoria_id", e.target.value)}
               className={SELECT_CLASS}
               required
            >
               {CategoriaEquipos.length === 0 ? (
                  <option value="">Sin categorías — crea una primero</option>
               ) : (
                  CategoriaEquipos.map((c) => (
                     <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))
               )}
            </select>
            {selectedCat && (
               <p className="text-xs text-muted-foreground">
                  Se cobra en: <span className="font-medium">{selectedCat.cobra_en}</span>
                  {selectedCat.cobra_minimo != null && (
                     <span className="ml-1">(mín. {selectedCat.cobra_minimo})</span>
                  )}
               </p>
            )}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="ef-estado">Estado</Label>
            <select
               id="ef-estado"
               value={values.estado}
               onChange={(e) => set("estado", e.target.value as EstadoEquipo)}
               className={SELECT_CLASS}
            >
               {ESTADOS_EQUIPO.map((s) => (
                  <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
               ))}
            </select>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-operador">Operador</Label>
               <SelectBuscadorOperator
                  value={values.operador_id ?? null}
                  onChange={(id) => {
                     setValues((prev) => ({ ...prev, operador_id: id ?? undefined }));
                  }} disabled={loading} placeholder="Buscar operador..." />
            </div>
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-ano">Año</Label>
               <Input
                  id="ef-ano"
                  type="number"
                  min="1950"
                  step="1"
                  value={values.ano}
                  onChange={(e) => set("ano", e.target.value)}
                  placeholder="ej. 2020"
               />
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-placa">Placa</Label>
               <Input
                  id="ef-placa"
                  value={values.placa}
                  onChange={(e) => set("placa", e.target.value)}
                  placeholder="ej. EX-1023"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <Label htmlFor="ef-modelo">Modelo</Label>
               <Input
                  id="ef-modelo"
                  value={values.modelo}
                  onChange={(e) => set("modelo", e.target.value)}
                  placeholder="ej. CAT 320"
               />
            </div>
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <div className="flex gap-2 justify-end pt-2">
            {onCancel && (
               <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancelar
               </Button>
            )}
            <Button type="submit" disabled={loading || CategoriaEquipos.length === 0}>
               {loading ? "Guardando…" : submitLabel}
            </Button>
         </div>
         <CategoriaEquipoManager open={manageOpen} onOpenChange={setManageOpen} />
      </form>
   );
}
