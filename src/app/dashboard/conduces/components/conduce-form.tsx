"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
// Importar componentes del Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Truck, HardHat, TriangleAlert } from "lucide-react";
import { useClientStore } from "@/stores/useClientStore";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useMedidaCobroStore } from "@/stores/useMedidaCobroStore";
import { useProyectoTarifaStore } from "@/stores/useProyectoTarifaStore";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { SelectBuscarEquipos } from "@/components/select-equipos";
import type { Equipo } from "@/dtos/equipo.dto";
import type { CreateConduceForm, TipoConduce } from "@/dtos/conduce.dto";
import type { Proyecto } from "@/dtos/proyecto.dto";
import { fechaRD } from "@/lib/utils";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { ClientForm } from "../../clientes/components/client-form";
import { SelectBuscadorProyecto } from "@/components/shared/selectBuscadorProyecto";
import { ProyectoForm } from "../../proyectos/components/proyecto-form";
import { SelectBuscadorOperator } from "@/components/select-operator";
import { useEmployeeStore } from "@/stores/useEmployeeStore";

// AÑADIR ESTA IMPORTACIÓN (Ajusta la ruta según tu proyecto)

interface Props {
   onSubmit: (data: CreateConduceForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
   fixedProyectoId?: string;
   fixedClienteId?: string;
   fixedClienteNombre?: string;
}

function ayerISO() {
   const fecha = new Date();
   fecha.setDate(fecha.getDate() - 1);
   const year = fecha.getFullYear();
   const month = String(fecha.getMonth() + 1).padStart(2, "0");
   const day = String(fecha.getDate()).padStart(2, "0");
   return `${year}-${month}-${day}`;
}

function calcularHoras(inicio?: string, fin?: string): number {
   if (!inicio || !fin) return 0;
   const [h1, m1] = inicio.split(":").map(Number);
   const [h2, m2] = fin.split(":").map(Number);
   const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
   return minutos > 0 ? Math.round((minutos / 60) * 100) / 100 : 0;
}

export function ConduceForm({ onSubmit, onCancel, loading, fixedProyectoId, fixedClienteId, fixedClienteNombre }: Props) {
   const { Clients, GetClients, CreateClient } = useClientStore();
   const { GetEquipos } = useEquipoStore();
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();
   const { GetMedidaCobros, getNombre: getNombreMedidaCobro, MedidaCobros } = useMedidaCobroStore();
   const { proyectos, CreateProyecto, GetProyectosByClientId, GetProyectoById } = useProyectoStore();
   const { GetTarifas, getTarifa } = useProyectoTarifaStore();
   const { GetOperators, Operators } = useEmployeeStore();

   // ── Estados para el Modal de Crear Cliente ──
   const [isClientModalOpen, setIsClientModalOpen] = useState(false);
   const [isProyectoModalOpen, setIsProyectoModalOpen] = useState(false);
   const [newClientInitialName, setNewClientInitialName] = useState("");
   const [newProyectoInitialName, setNewProyectoInitialName] = useState("");
   const [isCreatingClient, setIsCreatingClient] = useState(false);
   const [isCreatingProyecto, setIsCreatingProyecto] = useState(false);
   const [clienteId, setClienteId] = useState("");
   const [clienteNombre, setClienteNombre] = useState("");

   // 1. Carga inicial (Solo se ejecuta al cargar el componente)
   useEffect(() => {
      GetClients();
      GetEquipos();
      GetCategoriaEquipos();
      GetMedidaCobros();
      GetOperators({ search: "", limit: 20, force: true });

      // (Opcional) Si quieres que al inicio salgan TODOS los proyectos si no hay cliente:
   }, [GetClients, GetEquipos, GetCategoriaEquipos, GetMedidaCobros, GetOperators]);

   useEffect(() => {
      if (clienteId) { GetProyectosByClientId(clienteId); }
   }, [clienteId]);

   // Auto-completar cliente cuando viene desde un proyecto
   useEffect(() => {
      if (!fixedClienteId || Clients.length === 0) return;
      const cliente = Clients.find((c) => c.id === fixedClienteId);
      setClienteId(fixedClienteId);
      setClienteNombre(fixedClienteNombre ?? cliente?.nombre ?? "");
      if (cliente?.telefono) setClienteTelefono(cliente.telefono);
   }, [fixedClienteId, fixedClienteNombre, Clients]);

   const [tipoConduce, setTipoConduce] = useState<TipoConduce>("CAMION");


   // ── Comunes ──
   const [numeroReferencia, setNumeroReferencia] = useState("");
   const [fecha, setFecha] = useState(ayerISO());
   const [proyectoId, setProyectoId] = useState(fixedProyectoId ?? "");
   const [proyectoNombre, setProyectoNombre] = useState("");
   const [clienteTelefono, setClienteTelefono] = useState("");
   const [equipoId, setEquipoId] = useState("");
   const [operadorId, setOperadorId] = useState(""); // NUEVO ESTADO
   const [categoriaEquipoId, setCategoriaEquipoId] = useState("");
   const [categoriaEquipoTarifaId, setCategoriaEquipoTarifaId] = useState("");
   const [categoriaEquipoTarifaNombre, setCategoriaEquipoTarifaNombre] = useState("");
   const [precioUnitario, setPrecioUnitario] = useState(0);
   const [esCobrable, setEsCobrable] = useState(true);
   const [observaciones, setObservaciones] = useState("");
   const [medidaCobroId, setMedidaCobroId] = useState("");

   // ── Camión ──
   const [procedencia, setProcedencia] = useState("");
   const [destino, setDestino] = useState("");
   const [cantidad, setCantidad] = useState(0);
   const [firmaChofer, setFirmaChofer] = useState(true);
   const [firmaRecibido, setFirmaRecibido] = useState(true);

   // ── Equipo Pesado ──
   const [horarioMananaInicio, setHorarioMananaInicio] = useState("");
   const [horarioMananaFin, setHorarioMananaFin] = useState("");
   const [horarioTardeInicio, setHorarioTardeInicio] = useState("");
   const [horarioTardeFin, setHorarioTardeFin] = useState("");
   const [combustibleCliente, setCombustibleCliente] = useState(false);
   const [firmaObservante, setFirmaObservante] = useState(true);
   const [firmaCamionero, setFirmaCamionero] = useState(true);

   const [error, setError] = useState<string | null>(null);
   const [avisoOperador, setAvisoOperador] = useState<string | null>(null);
   const [repetirCampos, setRepetirCampos] = useState(false);

   useEffect(() => {
      if (proyectoId) GetTarifas(proyectoId);
   }, [proyectoId, GetTarifas]);

   // Si se selecciona un proyecto y ya hay una tarifa seleccionada, actualizar el precio
   useEffect(() => {
      if (!proyectoId) return;
      if (!categoriaEquipoTarifaId) return;
      const nuevoPrecio = resolverPrecio(categoriaEquipoTarifaId);
      setPrecioUnitario(nuevoPrecio);
   }, [proyectoId]);

   const opcionesTarifa = useMemo(() => {
      const categoria = CategoriaEquipos.find((c) => c.id === categoriaEquipoId);
      return (categoria?.tarifas ?? [])
         .filter((t) => !!t.id)
         .map((t) => ({ ...t, medida_cobro_nombre: getNombreMedidaCobro(t.medida_cobro_id) ?? "unidad" }));
   }, [CategoriaEquipos, categoriaEquipoId, getNombreMedidaCobro]);

   const tarifaSeleccionada = opcionesTarifa.find((t) => t.id === categoriaEquipoTarifaId);

   function resolverPrecio(tarifaId: string): number {
      if (proyectoId) {
         const tarifaProyecto = getTarifa(proyectoId, tarifaId);
         if (tarifaProyecto) return tarifaProyecto.precio_unitario;
      }
      return opcionesTarifa.find((t) => t.id === tarifaId)?.precio_unitario ?? 0;
   }

   const totalHoras = useMemo(
      () =>
         calcularHoras(horarioMananaInicio, horarioMananaFin) +
         calcularHoras(horarioTardeInicio, horarioTardeFin),
      [horarioMananaInicio, horarioMananaFin, horarioTardeInicio, horarioTardeFin]
   );

   function limpiarCamposDeTipo() {
      setProcedencia("");
      setDestino("");
      setCantidad(0);
      setFirmaChofer(true);
      setFirmaRecibido(true);
      setHorarioMananaInicio("");
      setHorarioMananaFin("");
      setHorarioTardeInicio("");
      setHorarioTardeFin("");
      setMedidaCobroId("");
      setCombustibleCliente(false);
      setFirmaObservante(true);
      setFirmaCamionero(true);
   }

   function handleCambiarTipo(tipo: TipoConduce) {
      setTipoConduce(tipo);
      setEquipoId("");
      setOperadorId("")
      setAvisoOperador(null);
      setCategoriaEquipoId("");
      setCategoriaEquipoTarifaId("");
      setMedidaCobroId("");
      setPrecioUnitario(0);
      limpiarCamposDeTipo();
   }

   function handleClienteChange(id: string) {
      setClienteId(id);
      const cliente = Clients.find((c) => c.id === id) as { telefono?: string | null; nombre?: string | null } | undefined;
      setClienteTelefono(cliente?.telefono ?? "");
      setClienteNombre(cliente?.nombre ?? "");

      // NUEVO: Resetea el proyecto seleccionado si se cambia de cliente
      if (!fixedProyectoId) {
         setProyectoId("");
         setProyectoNombre("")
      }
   }

   function handleSelectEquipo(id: string | number | null, equipo: Equipo | null) {
      setCategoriaEquipoTarifaId("");
      setPrecioUnitario(0);
      setMedidaCobroId("");
      setCategoriaEquipoTarifaNombre("");

      if (!equipo) {
         setEquipoId("");
         setCategoriaEquipoId("");
         setOperadorId("")
         setAvisoOperador(null);
         return;
      }
      setEquipoId(String(id ?? ""));
      setCategoriaEquipoId(equipo.categoria_id);

      if (equipo.operador_id) {
         // No se registra un conduce con un operador inactivo: si el operador
         // asignado al equipo está inactivo, se exige elegir otro a mano.
         const operadorDelEquipo = Operators.find((o) => o.id === equipo.operador_id);
         if (operadorDelEquipo && operadorDelEquipo.activo === false) {
            setOperadorId("");
            setAvisoOperador(
               `El operador de este equipo (${operadorDelEquipo.nombre}) está inactivo. Selecciona otro operador para registrar el conduce.`
            );
         } else {
            setOperadorId(String(equipo.operador_id));
            setAvisoOperador(null);
         }
      } else {
         setOperadorId("");
         setAvisoOperador(null);
      }
   }

   function handleTarifaChange(id: string) {
      setCategoriaEquipoTarifaId(id);
      if (id === "manual") {
         setCategoriaEquipoTarifaId("");
         setPrecioUnitario(0);
         setCategoriaEquipoTarifaNombre("Manual");
         // Dejamos la medida de cobro intacta para que la elija manualmente
         return;
      }

      const tarifa = opcionesTarifa.find((t) => t.id === id);
      setCategoriaEquipoTarifaNombre(tarifa?.nombre ?? "");
      setPrecioUnitario(resolverPrecio(id));

      // Auto-completar la medida de cobro según la tarifa elegida
      if (tarifa && tarifa.medida_cobro_id) {
         setMedidaCobroId(tarifa.medida_cobro_id);
      }
   }

   function buildPayload(): CreateConduceForm | null {
      if (!clienteId) { setError("El cliente es requerido"); return null; }
      if (!equipoId) { setError(tipoConduce === "CAMION" ? "El equipo (placa) es requerido" : "El equipo es requerido"); return null; }
      if (!medidaCobroId) { setError("La unidad de medida es requerida"); return null; } // <-- Nueva validación
      if (!numeroReferencia.trim()) { setError("El número de referencia (folio) es requerido"); return null; }
      if (!fecha) { setError("La fecha es requerida"); return null; }

      const comun = {
         numero_referencia: numeroReferencia.trim(),
         fecha,
         proyecto_id: proyectoId || null,
         cliente_id: clienteId,
         cliente_telefono: clienteTelefono || null,
         operador_id: operadorId,
         equipo_id: equipoId,
         /*
            En captura manual no hay tarifa del catálogo: se OMITE el campo en
            vez de mandar "". Mandarlo vacío guardaba la fila con el nombre
            puesto y el id en NULL, que es justo el estado que la nómina no
            puede cobrar ni corregir.
         */
         ...(categoriaEquipoTarifaId
            ? { categoria_equipo_tarifa_id: categoriaEquipoTarifaId }
            : {}),
         medida_cobro_id: medidaCobroId,
         medida_cobro_nombre: getNombreMedidaCobro(medidaCobroId) || null,
         categoria_equipo_tarifa_nombre: categoriaEquipoTarifaNombre || null,
         es_cobrable: esCobrable,
         observaciones: observaciones || null,
         precio_unitario: precioUnitario,
      };

      if (tipoConduce === "CAMION") {
         if (cantidad <= 0) { setError("Los botes/viajes deben ser mayor a 0"); return null; }

         return {
            tipo_conduce: "CAMION",
            ...comun,
            procedencia: procedencia.trim() ?? "",
            destino: destino.trim() ?? "",
            cantidad,
            firma_chofer: firmaChofer,
            firma_recibido: firmaRecibido,
         };
      }

      if (totalHoras <= 0) { setError("Registre al menos un horario (mañana o tarde)"); return null; }

      return {
         tipo_conduce: "EQUIPO_PESADO",
         ...comun,
         horario_manana_inicio: horarioMananaInicio || null,
         horario_manana_fin: horarioMananaFin || null,
         horario_tarde_inicio: horarioTardeInicio || null,
         horario_tarde_fin: horarioTardeFin || null,
         total_horas: totalHoras,
         combustible_pagado_cliente: combustibleCliente,
         firma_observante: firmaObservante,
         firma_camionero: firmaCamionero,
      };
   }

   async function handleSubmit(e: React.FormEvent, seguirRegistrando: boolean) {
      e.preventDefault();
      setError(null);
      const payload = buildPayload();
      if (!payload) return;

      if (!seguirRegistrando) {
         // Si es "Guardar y Cerrar", cerramos el modal de inmediato
         onCancel();
      } else if (!repetirCampos) {
         // 1. LIMPIEZA INMEDIATA (Optimista)
         // Reseteamos los campos al instante para que el usuario pueda escribir el siguiente conduce sin esperar
         setNumeroReferencia("");
         setEquipoId("");
         setOperadorId("")
         setCategoriaEquipoId("");
         setCategoriaEquipoTarifaId("");
         setMedidaCobroId("");
         setPrecioUnitario(0);
         if (tipoConduce === "CAMION") {
            setCantidad(0);
            setFirmaChofer(true);
            setFirmaRecibido(true);
         } else {
            setHorarioMananaInicio("");
            setHorarioMananaFin("");
            setHorarioTardeInicio("");
            setHorarioTardeFin("");
            setFirmaObservante(true);
            setFirmaCamionero(true);
         }
      }

      // 2. PETICIÓN EN SEGUNDO PLANO (Background Mutation)
      // Disparamos la acción sin bloquear la pantalla con un "loading" global
      try {
         await onSubmit(payload);
      } catch (error) {
         // Si falla, aquí puedes disparar una alerta tipo Toast (ej: sonner o shadcn toast)
         console.error("Error al guardar el conduce en segundo plano:", error);
      }
   }

   const subtotal = tipoConduce === "CAMION" ? cantidad * precioUnitario : totalHoras * precioUnitario;

   // Determinar el nombre de la medida para las etiquetas dinámicas
   const nombreMedidaActual = tarifaSeleccionada?.medida_cobro_nombre || getNombreMedidaCobro(medidaCobroId);

   // Valor del proyecto para la tarifa elegida, si el proyecto tiene uno
   // (gana sobre el general por prioridad; el general se muestra de referencia).
   const tarifaSeleccionadaProyecto = tarifaSeleccionada && proyectoId
      ? getTarifa(proyectoId, tarifaSeleccionada.id as string)
      : undefined;

   const selectorTarifa = (
      <div className="space-y-2">
         <div className="space-y-1.5">
            <Label>Tipo de Tarifa Aplicable</Label>
            <Select value={categoriaEquipoTarifaId || "manual"} onValueChange={handleTarifaChange} disabled={!categoriaEquipoId}>
               <SelectTrigger>
                  <SelectValue placeholder={categoriaEquipoId ? "Seleccionar..." : "Elige un equipo"} />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="manual">-- Manual / Sin tarifa --</SelectItem>
                  {opcionesTarifa.map((t) => (
                     <SelectItem key={t.id} value={t.id as string}>
                        {t.nombre}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {/* Valor que se aplica: el del proyecto si lo tiene, si no la general. */}
         {tarifaSeleccionada && (
            <div className="animate-in fade-in slide-in-from-top-1 mt-1 rounded-md border bg-muted/10 p-2">
               {tarifaSeleccionadaProyecto ? (
                  <p className="text-xs">
                     <span className="text-muted-foreground">Valor de este proyecto: </span>
                     <span className="font-semibold">
                        RD$ {tarifaSeleccionadaProyecto.precio_unitario.toLocaleString("es-DO")}
                     </span>
                     <span className="text-muted-foreground">
                        {" "}· general RD$ {tarifaSeleccionada.precio_unitario.toLocaleString("es-DO")}
                     </span>
                  </p>
               ) : (
                  <p className="text-xs">
                     <span className="text-muted-foreground">Tarifa general: </span>
                     <span className="font-semibold">
                        RD$ {tarifaSeleccionada.precio_unitario.toLocaleString("es-DO")}
                     </span>
                  </p>
               )}
            </div>
         )}

         {/* ── SE MUESTRA SOLO SI ESTÁ EN MODO MANUAL ── */}
         {!categoriaEquipoTarifaId && (
            <div className="animate-in fade-in slide-in-from-top-1 rounded-md border border-dashed bg-muted/10 p-2 space-y-1.5 mt-1">
               <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Unidad de Medida (Manual) *
               </Label>
               <Select
                  value={medidaCobroId}
                  onValueChange={(value) => {
                     setMedidaCobroId(value);
                  }}
               >
                  <SelectTrigger className="h-8 text-xs">
                     <SelectValue placeholder="Selecciona una medida..." />
                  </SelectTrigger>
                  <SelectContent>
                     {MedidaCobros.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                           {m.nombre}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
               {tipoConduce === "CAMION" && (
                  <>
                     <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                        Tipo de trabajo (Manual) *
                     </Label><Select value={categoriaEquipoTarifaNombre} onValueChange={setCategoriaEquipoTarifaNombre}>
                        <SelectTrigger className="h-8 text-xs">
                           <SelectValue placeholder="Selecciona una medida..." />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value={"Viaje"} className="text-xs">
                              Viaje
                           </SelectItem>
                           <SelectItem value={"Bote"} className="text-xs">
                              Bote
                           </SelectItem>
                        </SelectContent>
                     </Select>
                  </>
               )}
            </div>
         )}
      </div>
   );

   return (
      <>
         <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {/* ── Selector de tipo ── */}
            <div className="grid grid-cols-2 gap-2">
               <button
                  type="button"
                  onClick={() => handleCambiarTipo("CAMION")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-2.5 text-sm font-semibold transition-colors ${tipoConduce === "CAMION"
                     ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                     : "border-muted text-muted-foreground"
                     }`}
               >
                  <Truck className="size-4" /> Camión
               </button>
               <button
                  type="button"
                  onClick={() => handleCambiarTipo("EQUIPO_PESADO")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-2.5 text-sm font-semibold transition-colors ${tipoConduce === "EQUIPO_PESADO"
                     ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                     : "border-muted text-muted-foreground"
                     }`}
               >
                  <HardHat className="size-4" /> Equipo Pesado
               </button>
            </div>

            {/* ── Comunes ── */}
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label htmlFor="numero-referencia">Número de Referencia *</Label>
                  <Input
                     id="numero-referencia"
                     autoFocus
                     value={numeroReferencia}
                     onChange={(e) => setNumeroReferencia(e.target.value)}
                     placeholder="Ej. 00234"
                  />
               </div>
               <div className="space-y-1.5">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label>Cliente *</Label>
                  <SelectBuscadorClient
                     value={clienteId}
                     onChange={(e) => handleClienteChange(e || "")}
                     initialLabel={clienteNombre}
                     disabled={!!fixedClienteId}
                     onCreateNew={(term) => {
                        setNewClientInitialName(term);
                        setIsClientModalOpen(true);
                     }}
                  />
               </div>
               <div className="space-y-1.5">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                     id="telefono"
                     value={clienteTelefono}
                     onChange={(e) => setClienteTelefono(e.target.value)}
                     placeholder="Opcional"
                  />
               </div>
            </div>

            {!fixedProyectoId && (
               <div className="space-y-1.5">
                  <Label>Proyecto (opcional)</Label>
                  <SelectBuscadorProyecto
                     value={proyectoId}
                     initialLabel={proyectoNombre}
                     clienteId={clienteId} // <-- Pasa el clienteId para que filtre internamente
                     onCreateNew={(term) => {
                        setNewProyectoInitialName(term);
                        setIsProyectoModalOpen(true);
                     }}
                     onChange={async (id) => {
                        setProyectoId(id || "");
                        let proy: Proyecto | null | undefined = id ? proyectos.find((p) => p.id === id) : undefined;
                        if (id && !proy) proy = await GetProyectoById(id);
                        setProyectoNombre(proy?.nombre ?? "");

                        // Auto-completar el cliente según el proyecto elegido
                        if (proy?.cliente_id && !fixedClienteId) {
                           const cliente = Clients.find((c) => c.id === proy.cliente_id);
                           setClienteId(proy.cliente_id);
                           setClienteNombre(proy.cliente_nombre || cliente?.nombre || "");
                           setClienteTelefono(cliente?.telefono ?? "");
                        }
                     }}
                  />
               </div>
            )}

            <Separator />

            {tipoConduce === "CAMION" ? (
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label>Placa / Equipo *</Label>
                        <SelectBuscarEquipos key={tipoConduce} tipo="CAMION" value={equipoId || null} onChange={(id, equipo) => handleSelectEquipo(id, equipo)} />
                     </div>
                     <div className="space-y-1.5">
                        <Label>Operador *</Label>
                        <SelectBuscadorOperator
                           value={operadorId || null}
                           onChange={(id) => {
                              setOperadorId(id || "");
                              setAvisoOperador(null);
                           }}
                        />
                        {avisoOperador && (
                           <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                              <TriangleAlert className="size-3.5" />
                              {avisoOperador}
                           </p>
                        )}
                     </div>
                     {selectorTarifa}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="procedencia">Procedencia</Label>
                        <Input id="procedencia" value={procedencia} onChange={(e) => setProcedencia(e.target.value)} placeholder="Origen del material" />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="destino">Destino</Label>
                        <Input id="destino" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Destino de entrega" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="cantidad">
                           {nombreMedidaActual?.toLowerCase().includes("viaje")
                              ? "Cantidad de Viajes *"
                              : "Botes / Viajes *"}
                        </Label>
                        <Input
                           id="cantidad"
                           type="number"
                           min={0}
                           step="1" // Usualmente los viajes son números enteros (1, 2, 3...)
                           value={cantidad}
                           onChange={(e) => setCantidad(Number(e.target.value))}
                        />

                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="precio-camion">
                           Precio Unitario{" "}
                           <span className="text-xs text-muted-foreground">
                              ({proyectoId && getTarifa(proyectoId, categoriaEquipoTarifaId) ? "tarifa de este proyecto" : "por defecto: tarifa de la categoría"})
                           </span>
                        </Label>
                        <Input
                           id="precio-camion"
                           type="number"
                           min={0}
                           step="0.01"
                           value={precioUnitario}
                           onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                        />
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                     <CheckboxField id="firma-chofer" label="Firma del chofer" checked={firmaChofer} onChange={setFirmaChofer} />
                     <CheckboxField id="firma-recibido" label="Firma de recibido" checked={firmaRecibido} onChange={setFirmaRecibido} />
                  </div>
               </div>
            ) : (
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label>Equipo *</Label>
                        <SelectBuscarEquipos key={tipoConduce} tipo="EQUIPO" value={equipoId || null} onChange={(id, equipo) => handleSelectEquipo(id, equipo)} />
                     </div>
                     <div className="space-y-1.5">
                        <Label>Operador *</Label>
                        <SelectBuscadorOperator
                           value={operadorId || null}
                           onChange={(id) => {
                              setOperadorId(id || "");
                              setAvisoOperador(null);
                           }}
                        />
                        {avisoOperador && (
                           <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                              <TriangleAlert className="size-3.5" />
                              {avisoOperador}
                           </p>
                        )}
                     </div>
                     {selectorTarifa}
                  </div>

                  <div className="rounded-lg border p-3 space-y-3">
                     <p className="text-xs font-semibold uppercase text-muted-foreground">Horario de Mañana</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label htmlFor="am-inicio">Desde</Label>
                           <Input id="am-inicio" type="time" value={horarioMananaInicio} onChange={(e) => setHorarioMananaInicio(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                           <Label htmlFor="am-fin">Hasta</Label>
                           <Input id="am-fin" type="time" value={horarioMananaFin} onChange={(e) => setHorarioMananaFin(e.target.value)} />
                        </div>
                     </div>

                     <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Horario de Tarde</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <Label htmlFor="pm-inicio">Desde</Label>
                           <Input id="pm-inicio" type="time" value={horarioTardeInicio} onChange={(e) => setHorarioTardeInicio(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                           <Label htmlFor="pm-fin">Hasta</Label>
                           <Input id="pm-fin" type="time" value={horarioTardeFin} onChange={(e) => setHorarioTardeFin(e.target.value)} />
                        </div>
                     </div>

                     <div className="flex justify-between text-sm pt-1 border-t">
                        <span className="text-muted-foreground">Total de horas (calculado)</span>
                        <span className="font-semibold">{totalHoras.toFixed(2)} h</span>
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <Label htmlFor="precio-equipo">
                        Precio {nombreMedidaActual ? `por ${nombreMedidaActual}` : ""} (RD$)
                        <span className="ml-1 text-xs text-muted-foreground">
                           {proyectoId && getTarifa(proyectoId, categoriaEquipoTarifaId)
                              ? "tarifa de este proyecto"
                              : "normalmente se acuerda con el cliente — puede dejarse en 0"}
                        </span>
                     </Label>
                     <Input
                        id="precio-equipo"
                        type="number"
                        min={0}
                        step="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                     />
                  </div>

                  <div className="flex flex-wrap gap-6">
                     <CheckboxField id="combustible" label="Combustible pagado por el cliente" checked={combustibleCliente} onChange={setCombustibleCliente} />
                     <CheckboxField id="firma-observante" label="Firma del observante/cliente" checked={firmaObservante} onChange={setFirmaObservante} />
                     <CheckboxField id="firma-camionero" label="Firma del camionero" checked={firmaCamionero} onChange={setFirmaCamionero} />
                  </div>
               </div>
            )}

            <Separator />

            <CheckboxField
               id="es-cobrable"
               label="Cobrable (si se destilda, solo queda en el historial y no entra al total facturado)"
               checked={esCobrable}
               onChange={setEsCobrable}
            />

            <Textarea
               placeholder="Observaciones (opcional)"
               value={observaciones}
               onChange={(e) => setObservaciones(e.target.value)}
               rows={2}
            />

            <div className="rounded-lg border bg-muted/30 p-3 flex justify-between text-sm">
               <span className="text-muted-foreground">Subtotal de este conduce</span>
               <span className="font-semibold">RD$ {subtotal.toLocaleString("es-DO")}</span>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
               <CheckboxField
                  id="repetir-campos"
                  label="Mantener los mismos campos al registrar otro"
                  checked={repetirCampos}
                  onChange={setRepetirCampos}
               />
               <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                     Cancelar
                  </Button>
                  <Button
                     type="button"
                     variant="outline"
                     disabled={loading}
                     onClick={(e) => handleSubmit(e, true)}
                  >
                     {loading ? "Guardando…" : "Guardar y Registrar Otro"}
                  </Button>
                  <Button
                     type="submit"
                     disabled={loading}
                     className="bg-brand-yellow text-brand-black hover:bg-yellow-300 font-semibold border-0"
                  >
                     {loading ? "Guardando…" : "Guardar y Cerrar"}
                  </Button>
               </div>
            </div>
         </form>

         {/* ── Modal de Creación de Cliente ── */}
         <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
            <DialogContent className="max-w-xl">
               <DialogHeader>
                  <DialogTitle>Crear Nuevo Cliente</DialogTitle>
               </DialogHeader>
               <ClientForm
                  initialData={{ nombre: newClientInitialName }}
                  loading={isCreatingClient}
                  onSubmit={async (data) => {
                     setIsCreatingClient(true);
                     try {
                        const result = await CreateClient({
                           ...data,
                           email: data.email || null,
                           telefono: data.telefono || null,
                           direccion: data.direccion || null,
                        });

                        if (result instanceof Error) throw result;

                        // 1. Auto-seleccionar el cliente recién creado
                        // Asumimos que result devuelve el objeto del cliente con su id y nombre
                        if (result && result.id) {
                           setClienteId(result.id);
                           setClienteTelefono(result.telefono || "");
                           setClienteNombre(result.nombre || data.nombre); // Fuerza visualmente el nombre

                           // Refrescar la caché del store para que aparezca en futuras búsquedas
                           GetClients();
                        }

                        // 2. Cerrar el modal
                        setIsClientModalOpen(false);

                     } catch (error) {
                        console.error("Error al crear cliente", error);
                     } finally {
                        setIsCreatingClient(false);
                     }
                  }}
                  onCancel={() => setIsClientModalOpen(false)}
               />
            </DialogContent>
         </Dialog>

         {/* ── Modal de Creación de Proyecto ── */}
         <Dialog open={isProyectoModalOpen} onOpenChange={setIsProyectoModalOpen}

         >
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                  <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
               </DialogHeader>
               <ProyectoForm
                  initialData={{ nombre: newProyectoInitialName, cliente_id: clienteId }}
                  loading={isCreatingProyecto}
                  onSubmit={async (data) => {
                     setIsCreatingProyecto(true);
                     try {
                        const result = await CreateProyecto({
                           ...data,
                           cliente_id: clienteId || data.cliente_id,
                           fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio).toISOString() : undefined,
                           fecha_fin: data.fecha_fin ? new Date(data.fecha_fin).toISOString() : undefined,
                        });

                        if (result instanceof Error) throw result;

                        // 1. Auto-seleccionar el proyecto recién creado
                        if (result && result.id) {
                           setProyectoId(result.id);
                           setProyectoNombre(result.nombre || data.nombre);
                        }

                        // 2. Cerrar el modal de proyecto correctamente
                        setIsProyectoModalOpen(false);

                     } catch (error) {
                        console.error("Error al crear proyecto", error);
                     } finally {
                        setIsCreatingProyecto(false);
                     }
                  }}
                  onCancel={() => setIsProyectoModalOpen(false)}
               />
            </DialogContent>
         </Dialog>
      </>
   );
}

function CheckboxField({
   id, label, checked, onChange,
}: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
   return (
      <div className="flex items-center gap-2">
         <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 accent-brand-blue"
         />
         <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{label}</Label>
      </div>
   );
}