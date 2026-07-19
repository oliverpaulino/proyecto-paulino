// ─── Conduce ──────────────────────────────────────────────────────────────
// Reemplaza a proyecto_equipos + proyecto_tarifas. Hay dos "papeles físicos"
// distintos que se digitalizan aquí:
//   - CAMION: viaje/bote de material (procedencia, destino, tipo de carga).
//   - EQUIPO_PESADO: horas trabajadas por un equipo, en tandas AM/PM.
// Un conduce se registra uno por uno según avanza el trabajo en campo, en
// volumen alto, y no siempre nace ligado a un proyecto (proyecto_id es
// opcional — se puede dejar "sin asignar" y vincular después).

export type TipoConduce = "CAMION" | "EQUIPO_PESADO";
export type ModalidadCobroCarga = "VIAJE" | "BOTE";

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
   categoria_equipo_id: string;
   categoria_nombre?: string;

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
   tipo_carga_id: string;
   tipo_carga_nombre?: string;
   modalidad_cobro: ModalidadCobroCarga; // snapshot de tipo_carga.modalidad_cobro
   procedencia: string;
   destino: string;
   cantidad: number; // "metros": viajes o m3, según modalidad_cobro
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
   precio_unitario: number;
   es_cobrable: boolean;
   observaciones?: string | null;
}

export type CreateConduceCamionDTO = CreateConduceCommonDTO & {
   tipo_conduce: "CAMION";
   tipo_carga_id: string;
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
   findByProyectoId(proyectoId: string): Promise<ConduceProps[]>;
   findById(id: string): Promise<ConduceProps | null>;
   create(data: CreateConduceDTO): Promise<ConduceProps>;
   update(id: string, data: UpdateConduceDTO): Promise<ConduceProps>;
   delete(id: string): Promise<void>;
}