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
import { Truck, HardHat } from "lucide-react";
import { useClientStore } from "@/stores/useClientStore";
import { useEquipoStore } from "@/stores/useEquipoStore";
import { useCategoriaEquipoStore } from "@/stores/useCategoriaEquipoStore";
import { useMedidaCobroStore } from "@/stores/useMedidaCobroStore";
import { useProyectoTarifaStore } from "@/stores/useProyectoTarifaStore";
import { useProyectoStore } from "@/stores/useProyectoStore";
import { SelectBuscarEquipos } from "@/components/select-equipos";
import type { Equipo } from "@/dtos/equipo.dto";
import type { CreateConduceForm, TipoConduce } from "@/dtos/conduce.dto";
import { fechaRD } from "@/lib/utils";
import { TarifaCategoriaDTO } from "@/dtos/categoria-equipo.dto";
import { SelectBuscadorClient } from "@/components/shared/selectBuscadorClient";
import { ClientForm } from "../../clientes/components/client-form";

// AÑADIR ESTA IMPORTACIÓN (Ajusta la ruta según tu proyecto)

interface Props {
   onSubmit: (data: CreateConduceForm) => Promise<void>;
   onCancel: () => void;
   loading: boolean;
   fixedProyectoId?: string;
}

function hoyISO() {
   return `${fechaRD("year")}-${fechaRD("month")}-${fechaRD("day")}`;
}

function calcularHoras(inicio?: string, fin?: string): number {
   if (!inicio || !fin) return 0;
   const [h1, m1] = inicio.split(":").map(Number);
   const [h2, m2] = fin.split(":").map(Number);
   const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
   return minutos > 0 ? Math.round((minutos / 60) * 100) / 100 : 0;
}

export function ConduceForm({ onSubmit, onCancel, loading, fixedProyectoId }: Props) {
   const { Clients, GetClients, CreateClient } = useClientStore();
   const { GetEquipos } = useEquipoStore();
   const { CategoriaEquipos, GetCategoriaEquipos } = useCategoriaEquipoStore();
   const { GetMedidaCobros, getNombre: getNombreMedidaCobro } = useMedidaCobroStore();
   const { proyectos, GetProyectos, GetProyectosByClientId } = useProyectoStore();
   const { GetTarifas, getTarifa } = useProyectoTarifaStore();

   // ── Estados para el Modal de Crear Cliente ──
   const [isClientModalOpen, setIsClientModalOpen] = useState(false);
   const [newClientInitialName, setNewClientInitialName] = useState("");
   const [isCreatingClient, setIsCreatingClient] = useState(false);
   const [clienteId, setClienteId] = useState("");
   const [clienteNombre, setClienteNombre] = useState("");

   useEffect(() => {
      GetClients();
      GetEquipos();
      GetCategoriaEquipos();
      GetMedidaCobros();
      if (clienteId) GetProyectosByClientId(clienteId);
      if (!fixedProyectoId) GetProyectos();
   }, [GetClients, GetEquipos, GetCategoriaEquipos, GetMedidaCobros, GetProyectos, GetProyectosByClientId, fixedProyectoId, clienteId]);

   const [tipoConduce, setTipoConduce] = useState<TipoConduce>("CAMION");


   // ── Comunes ──
   const [numeroReferencia, setNumeroReferencia] = useState("");
   const [fecha, setFecha] = useState(hoyISO());
   const [proyectoId, setProyectoId] = useState(fixedProyectoId ?? "");
   const [clienteTelefono, setClienteTelefono] = useState("");
   const [equipoId, setEquipoId] = useState("");
   const [categoriaEquipoId, setCategoriaEquipoId] = useState("");
   const [categoriaEquipoTarifaId, setCategoriaEquipoTarifaId] = useState("");
   const [precioUnitario, setPrecioUnitario] = useState(0);
   const [esCobrable, setEsCobrable] = useState(true);
   const [observaciones, setObservaciones] = useState("");

   // ── Camión ──
   const [procedencia, setProcedencia] = useState("");
   const [destino, setDestino] = useState("");
   const [cantidad, setCantidad] = useState(0);
   const [firmaChofer, setFirmaChofer] = useState(false);
   const [firmaRecibido, setFirmaRecibido] = useState(false);

   // ── Equipo Pesado ──
   const [horarioMananaInicio, setHorarioMananaInicio] = useState("");
   const [horarioMananaFin, setHorarioMananaFin] = useState("");
   const [horarioTardeInicio, setHorarioTardeInicio] = useState("");
   const [horarioTardeFin, setHorarioTardeFin] = useState("");
   const [combustibleCliente, setCombustibleCliente] = useState(false);
   const [firmaObservante, setFirmaObservante] = useState(false);
   const [firmaCamionero, setFirmaCamionero] = useState(false);

   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (proyectoId) GetTarifas(proyectoId);
   }, [proyectoId, GetTarifas]);

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
      setFirmaChofer(false);
      setFirmaRecibido(false);
      setHorarioMananaInicio("");
      setHorarioMananaFin("");
      setHorarioTardeInicio("");
      setHorarioTardeFin("");
      setCombustibleCliente(false);
      setFirmaObservante(false);
      setFirmaCamionero(false);
   }

   function handleCambiarTipo(tipo: TipoConduce) {
      setTipoConduce(tipo);
      setEquipoId("");
      setCategoriaEquipoId("");
      setCategoriaEquipoTarifaId("");
      setPrecioUnitario(0);
      limpiarCamposDeTipo();
   }

   function handleClienteChange(id: string) {
      setClienteId(id);
      const cliente = Clients.find((c) => c.id === id) as { telefono?: string | null; nombre?: string | null } | undefined;
      setClienteTelefono(cliente?.telefono ?? "");
      setClienteNombre(cliente?.nombre ?? "");
   }

   function handleSelectEquipo(id: string | number | null, equipo: Equipo | null) {
      setCategoriaEquipoTarifaId("");
      setPrecioUnitario(0);

      if (!equipo) {
         setEquipoId("");
         setCategoriaEquipoId("");
         return;
      }
      setEquipoId(String(id ?? ""));
      setCategoriaEquipoId(equipo.categoria_id);
   }

   function handleTarifaChange(id: string) {
      setCategoriaEquipoTarifaId(id);
      setPrecioUnitario(resolverPrecio(id));
   }

   function buildPayload(): CreateConduceForm | null {
      if (!clienteId) { setError("El cliente es requerido"); return null; }
      if (!equipoId) { setError(tipoConduce === "CAMION" ? "El equipo (placa) es requerido" : "El equipo es requerido"); return null; }
      if (!categoriaEquipoTarifaId) { setError("Seleccione la tarifa aplicable"); return null; }
      if (!numeroReferencia.trim()) { setError("El número de referencia (folio) es requerido"); return null; }
      if (!fecha) { setError("La fecha es requerida"); return null; }

      const comun = {
         numero_referencia: numeroReferencia.trim(),
         fecha,
         proyecto_id: proyectoId || null,
         cliente_id: clienteId,
         cliente_telefono: clienteTelefono || null,
         equipo_id: equipoId,
         categoria_equipo_tarifa_id: categoriaEquipoTarifaId,
         es_cobrable: esCobrable,
         observaciones: observaciones || null,
         precio_unitario: precioUnitario,
      };

      if (tipoConduce === "CAMION") {
         if (!procedencia.trim()) { setError("La procedencia es requerida"); return null; }
         if (!destino.trim()) { setError("El destino es requerido"); return null; }
         if (cantidad <= 0) { setError("Los metros/viajes deben ser mayor a 0"); return null; }

         return {
            tipo_conduce: "CAMION",
            ...comun,
            procedencia: procedencia.trim(),
            destino: destino.trim(),
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

      await onSubmit(payload);

      if (seguirRegistrando) {
         setNumeroReferencia("");
         setEquipoId("");
         setCategoriaEquipoId("");
         setCategoriaEquipoTarifaId("");
         setPrecioUnitario(0);
         if (tipoConduce === "CAMION") {
            setCantidad(0);
            setFirmaChofer(false);
            setFirmaRecibido(false);
         } else {
            setHorarioMananaInicio("");
            setHorarioMananaFin("");
            setHorarioTardeInicio("");
            setHorarioTardeFin("");
            setFirmaObservante(false);
            setFirmaCamionero(false);
         }
      }
   }

   const subtotal = tipoConduce === "CAMION" ? cantidad * precioUnitario : totalHoras * precioUnitario;

   const selectorTarifa = (
      <div className="space-y-1.5">
         <Label>Tarifa Aplicable *</Label>
         <Select value={categoriaEquipoTarifaId} onValueChange={handleTarifaChange} disabled={!categoriaEquipoId}>
            <SelectTrigger><SelectValue placeholder={categoriaEquipoId ? "Seleccionar…" : "Elige un equipo primero"} /></SelectTrigger>
            <SelectContent>
               {opcionesTarifa.map((t) => (
                  <SelectItem key={t.id} value={t.id as string}>
                     {t.nombre} ({t.medida_cobro_nombre}) · RD$ {t.precio_unitario.toLocaleString("es-DO")}
                  </SelectItem>
               ))}
               {categoriaEquipoId && opcionesTarifa.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                     Esta categoría no tiene tarifas configuradas todavía.
                  </div>
               )}
            </SelectContent>
         </Select>
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
                  <Select value={proyectoId || "none"} onValueChange={(v) => setProyectoId(v === "none" ? "" : v)}>
                     <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="none">Sin asignar (asignar después)</SelectItem>
                        {proyectos.map((p) => (
                           <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
            )}

            <Separator />

            {tipoConduce === "CAMION" ? (
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label>Placa / Equipo *</Label>
                        <SelectBuscarEquipos value={equipoId || null} onChange={(id, equipo) => handleSelectEquipo(id, equipo)} />
                     </div>
                     {selectorTarifa}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="procedencia">Procedencia *</Label>
                        <Input id="procedencia" value={procedencia} onChange={(e) => setProcedencia(e.target.value)} placeholder="Origen del material" />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="destino">Destino *</Label>
                        <Input id="destino" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Destino de entrega" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="cantidad">{tarifaSeleccionada?.medida_cobro_nombre ?? "Cantidad"} *</Label>
                        <Input
                           id="cantidad"
                           type="number"
                           min={0}
                           step="0.5"
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
                        <SelectBuscarEquipos value={equipoId || null} onChange={(id, equipo) => handleSelectEquipo(id, equipo)} />
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
                        Precio {tarifaSeleccionada?.medida_cobro_nombre ? `por ${tarifaSeleccionada.medida_cobro_nombre}` : ""} (RD$)
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

            <div className="flex flex-wrap justify-end gap-2 pt-1">
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
         </form>

         {/* ── Modal de Creación de Cliente ── */}
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