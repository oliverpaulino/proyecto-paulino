"use client";

import { useEffect } from "react";
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
import { useProyectoStore } from "@/stores/useProyectoStore";
import type { ConduceFiltros } from "@/dtos/conduce.dto";

interface Props {
   filtros: ConduceFiltros;
   onChange: (filtros: ConduceFiltros) => void;
}

export function ConduceFiltrosBar({ filtros, onChange }: Props) {
   const { Clients, GetClients } = useClientStore();
   const { proyectos, GetProyectos } = useProyectoStore();

   useEffect(() => {
      GetClients();
      GetProyectos();
   }, [GetClients, GetProyectos]);

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
               value={filtros.busqueda ?? ""}
               onChange={(e) => set("busqueda", e.target.value || undefined)}
               placeholder="Ej. 00234"
            />
         </div>

         <div className="w-44 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Cliente</label>
            <Select value={filtros.cliente_id ?? "all"} onValueChange={(v) => set("cliente_id", v === "all" ? undefined : v)}>
               <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Clients.map((c) => (
                     <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         <div className="w-44 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
            <Select value={filtros.proyecto_id ?? "all"} onValueChange={(v) => set("proyecto_id", v === "all" ? undefined : v)}>
               <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {proyectos.map((p) => (
                     <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
               </SelectContent>
            </Select>
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
            <Input type="date" value={filtros.fecha_hasta ?? ""} onChange={(e) => set("fecha_hasta", e.target.value || undefined)} />
         </div>

         {hayFiltrosActivos && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ page: 1, pageSize: filtros.pageSize })}>
               <X className="size-4 mr-1" /> Limpiar filtros
            </Button>
         )}
      </div>
   );
}