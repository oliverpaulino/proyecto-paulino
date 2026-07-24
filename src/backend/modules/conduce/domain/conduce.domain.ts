// ─── Conduce ──────────────────────────────────────────────────────────────
// Reemplaza a proyecto_equipos + proyecto_tarifas. Hay dos "papeles físicos"
// distintos que se digitalizan aquí:
//   - CAMION: viaje/bote de material (procedencia, destino).
//   - EQUIPO_PESADO: horas trabajadas por un equipo, en tandas AM/PM.
// El PRECIO de ambos se resuelve igual: se elige una fila de
// categoria_equipo_tarifa (categoría + medida_cobro + precio, p.ej.
// "Arena - Viaje" o "Hora normal") filtrada por la categoría del equipo
// seleccionado. No existe una tabla "tipo_carga" aparte — esa función ya la
// cumple categoria_equipo_tarifa.
//
// Un conduce se registra uno por uno, en volumen, y no siempre nace ligado
// a un proyecto (proyecto_id es opcional — se puede asignar después).

export type TipoConduce = "CAMION" | "EQUIPO_PESADO";

interface ConduceBaseProps {
   id: string;
   numero_referencia: string; // folio físico que digita la oficina
   fecha: Date;

   proyecto_id: string | null;
   proyecto_nombre?: string;
   cliente_id: string;
   cliente_nombre?: string;
   cliente_telefono: string | null;

   equipo_id: string;
   equipo_nombre?: string;
   categoria_equipo_id: string; // snapshot, vía equipo.categoria_id
   categoria_equipo_nombre?: string;

   // La tarifa específica aplicada (categoría + medida_cobro + precio),
   // común a CAMION y EQUIPO_PESADO. `categoria_equipo_tarifa_id` es
   // best-effort (puede quedar en null si la tarifa origen se borra/regenera
   // — ver nota en database.ts sobre el hard-replace de categoria-equipo).
   // Para MOSTRAR el conduce, usa siempre los campos *_nombre snapshoteados,
   // nunca dependas de que el id siga existiendo.
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   medida_cobro_nombre: string;

   // Para casos que NO se cobran en el proyecto/trabajo pero igual se debe
   // mantener el registro histórico en la página.
   es_cobrable: boolean;
   observaciones: string | null;

   precio_unitario: number;
   subtotal: number;

   created_by: string | null;
   created_by_name?: string;
   created_at: Date;
   updated_at: Date;
}

export type ConduceCamionProps = ConduceBaseProps & {
   tipo_conduce: "CAMION";
   procedencia: string;
   destino: string;
   cantidad: number; // viajes, m3, etc. — según medida_cobro de la tarifa elegida
   firma_chofer: boolean;
   firma_recibido: boolean;
};

export type ConduceEquipoPesadoProps = ConduceBaseProps & {
   tipo_conduce: "EQUIPO_PESADO";
   horario_manana_inicio: string | null; // "HH:mm"
   horario_manana_fin: string | null;
   horario_tarde_inicio: string | null;
   horario_tarde_fin: string | null;
   total_horas: number;
   combustible_pagado_cliente: boolean;
   firma_observante: boolean;
   firma_camionero: boolean;
};

export type ConduceProps = ConduceCamionProps | ConduceEquipoPesadoProps;

// ─── DTOs de creación ────────────────────────────────────────────────────
interface CreateConduceCommonDTO {
   numero_referencia: string;
   fecha: Date;
   proyecto_id?: string | null;
   cliente_id: string;
   cliente_telefono?: string | null;
   equipo_id: string;
   operador_id?: string;
   categoria_equipo_tarifa_id?: string | null;
   categoria_equipo_tarifa_nombre?: string | null; // snapshot, vía categoria_equipo_tarifa.nombre
   medida_cobro_nombre?: string | null; // snapshot, vía categoria_equipo_tarifa.medida_cobro.nombre
   precio_unitario: number;
   es_cobrable: boolean;
   observaciones?: string | null;
}

export type CreateConduceCamionDTO = CreateConduceCommonDTO & {
   tipo_conduce: "CAMION";
   procedencia: string;
   destino: string;
   cantidad: number;
   firma_chofer: boolean;
   firma_recibido: boolean;
};

export type CreateConduceEquipoPesadoDTO = CreateConduceCommonDTO & {
   tipo_conduce: "EQUIPO_PESADO";
   horario_manana_inicio?: string | null;
   horario_manana_fin?: string | null;
   horario_tarde_inicio?: string | null;
   horario_tarde_fin?: string | null;
   total_horas: number;
   combustible_pagado_cliente: boolean;
   firma_observante: boolean;
   firma_camionero: boolean;
};

export type CreateConduceDTO = CreateConduceCamionDTO | CreateConduceEquipoPesadoDTO;

export type UpdateConduceDTO = Partial<Omit<CreateConduceCamionDTO, "tipo_conduce">> &
   Partial<Omit<CreateConduceEquipoPesadoDTO, "tipo_conduce">> & {
      tipo_conduce?: TipoConduce;
   };

// ─── Filtros de búsqueda (registro general con grandes volúmenes) ───────
export interface ConduceFiltros {
   proyecto_id?: string;
   empleado_id?: string;
   cliente_id?: string;
   tipo_conduce?: TipoConduce;
   es_cobrable?: boolean;
   fecha_desde?: Date;
   fecha_hasta?: Date;
   busqueda?: string; // numero_referencia / nombre de equipo (placa)
   page?: number;
   pageSize?: number;
}

export interface ConduceListResult {
   data: ConduceProps[];
   total: number;
   page: number;
   pageSize: number;
}

export interface IConduceRepository {
   findAll(filtros: ConduceFiltros): Promise<ConduceListResult>;
   findByProyectoId(proyectoId: string, search?: string, pagination?: { page: number, limit: number }): Promise<ConduceProps[]>;
   findById(id: string): Promise<ConduceProps | null>;
   create(data: CreateConduceDTO): Promise<ConduceProps>;
   update(id: string, data: UpdateConduceDTO): Promise<ConduceProps>;
   delete(id: string): Promise<void>;
}