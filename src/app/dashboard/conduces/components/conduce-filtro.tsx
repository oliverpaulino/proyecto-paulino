"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useClientStore } from "@/stores/useClientStore";
import type { ConduceFiltros } from "@/dtos/conduce.dto";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";

interface Props {
   filtros: ConduceFiltros;
   onChange: (filtros: ConduceFiltros) => void;
   debounceDelay?: number; // Opcional: para personalizar el retraso (por defecto 350ms)
}

export function ConduceFiltrosBar({ filtros, onChange, debounceDelay = 350 }: Props) {
   const { Clients, GetClients } = useClientStore();

   // Estados locales para los nombres seleccionados
   const [clienteNombre, setClienteNombre] = useState("");
   const [proyectoNombre, setProyectoNombre] = useState("");

   // Estado local para el input de búsqueda con debounce
   const [busquedaLocal, setBusquedaLocal] = useState(filtros.busqueda ?? "");

   useEffect(() => {
      GetClients();
   }, [GetClients]);

   // Sincronizar el estado local si los filtros cambian externamente (ej. al limpiar filtros)
   useEffect(() => {
      setBusquedaLocal(filtros.busqueda ?? "");
   }, [filtros.busqueda]);

   // Efecto de Debounce para la búsqueda
   useEffect(() => {
      const timer = setTimeout(() => {
         // Solo disparamos el cambio si el valor local difiere del filtro actual
         if (busquedaLocal !== (filtros.busqueda ?? "")) {
            onChange({ ...filtros, busqueda: busquedaLocal || undefined, page: 1 });
         }
      }, debounceDelay);

      return () => clearTimeout(timer);
   }, [busquedaLocal, debounceDelay]); // Nota: omitimos 'filtros' y 'onChange' para evitar loops, o los controlamos bien

   // Sincronizar nombres si los filtros cambian externamente o se limpian
   useEffect(() => {
      if (!filtros.cliente_id) {
         setClienteNombre("");
      } else {
         const cliente = Clients.find((c) => c.id === filtros.cliente_id);
         if (cliente) setClienteNombre(cliente.nombre);
      }
   }, [filtros.cliente_id, Clients]);

   function set<K extends keyof ConduceFiltros>(key: K, value: ConduceFiltros[K]) {
      onChange({ ...filtros, [key]: value, page: 1 });
   }

   const hayFiltrosActivos =
      filtros.cliente_id || filtros.proyecto_id || filtros.tipo_conduce ||
      filtros.es_cobrable !== undefined || filtros.fecha_desde || filtros.fecha_hasta || filtros.busqueda;

   return (
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/20 p-4">
         <div className="w-48 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Buscar (referencia/equipo)</label>
            <Input
               value={busquedaLocal}
               onChange={(e) => setBusquedaLocal(e.target.value)}
               placeholder="Ej. 00234"
            />
         </div>

         {/* Buscador de Cliente */}
         <div className="w-56 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <SelectBuscadorClient
               value={filtros.cliente_id}
               initialLabel={clienteNombre}
               placeholder="Todos los clientes..."
               onChange={(id) => {
                  set("cliente_id", id || undefined);
                  set("proyecto_id", undefined);
                  setProyectoNombre("");
               }}
            />
         </div>

         {/* Buscador de Proyecto */}
         <div className="w-56 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
            <SelectBuscadorProyecto
               value={filtros.proyecto_id}
               initialLabel={proyectoNombre}
               clienteId={filtros.cliente_id}
               placeholder="Todos los proyectos..."
               onChange={(id) => {
                  set("proyecto_id", id || undefined);
               }}
            />
         </div>

         <div className="w-40 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select
               value={filtros.tipo_conduce ?? "all"}
               onValueChange={(v) => set("tipo_conduce", v === "all" ? undefined : (v as ConduceFiltros["tipo_conduce"]))}
            >
               <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CAMION">Camión</SelectItem>
                  <SelectItem value="EQUIPO_PESADO">Equipo Pesado</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="w-32 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cobrable</label>
            <Select
               value={filtros.es_cobrable === undefined ? "all" : String(filtros.es_cobrable)}
               onValueChange={(v) => set("es_cobrable", v === "all" ? undefined : v === "true")}
            >
               <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="w-36 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Desde</label>
            <Input type="date" value={filtros.fecha_desde ?? ""} onChange={(e) => set("fecha_desde", e.target.value || undefined)} />
         </div>
         <div className="w-36 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hasta</label>
            <Input type="date" value={filtros.fecha_hasta ?? ""} min={filtros.fecha_desde || undefined} onChange={(e) => set("fecha_hasta", e.target.value || undefined)} />
         </div>

         {hayFiltrosActivos && (
            <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={() => {
                  setClienteNombre("");
                  setProyectoNombre("");
                  setBusquedaLocal("");
                  onChange({ page: 1, pageSize: filtros.pageSize });
               }}
            >
               <X className="size-4 mr-1" /> Limpiar filtros
            </Button>
         )}
      </div>
   );
}