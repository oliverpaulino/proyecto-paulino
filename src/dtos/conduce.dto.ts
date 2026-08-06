import { z } from "zod";

export const TIPO_CONDUCE = ["CAMION", "EQUIPO_PESADO"] as const;

const camposComunes = {
   numero_referencia: z.string().min(1, "El número de referencia es requerido"),
   fecha: z.string().min(1, "La fecha es requerida"),
   proyecto_id: z.string().nullable().optional(),
   cliente_id: z.string().min(1, "El cliente es requerido"),
   cliente_telefono: z.string().nullable().optional(),
   equipo_id: z.string().min(1, "El equipo es requerido"),
   operador_id: z.string().min(1, "El operador es requerido"),
   /*
      Opcional porque existe la captura manual (sin tarifa del catálogo), pero
      si viene tiene que ser un id de verdad: `""` se colaba y terminaba como
      NULL en la fila, conservando el nombre. Esa combinación —nombre puesto,
      id vacío— es la que la nómina no puede cobrar ni corregir.
   */
   categoria_equipo_tarifa_id: z
      .string()
      .min(1, "La tarifa no puede venir vacía: envíe un id válido u omita el campo")
      .optional(),
   categoria_equipo_tarifa_nombre: z.string().nullable().optional(),
   medida_cobro_nombre: z.string().nullable().optional(),
   es_cobrable: z.boolean(),
   observaciones: z.string().nullable().optional(),
   precio_unitario: z.number().min(0),
};

export const CreateConduceCamionSchema = z.object({
   tipo_conduce: z.literal("CAMION"),
   ...camposComunes,
   procedencia: z.string().min(1, "La procedencia es requerida"),
   destino: z.string().min(1, "El destino es requerido"),
   cantidad: z.number().positive("Debe ser mayor a 0"),
   firma_chofer: z.boolean(),
   firma_recibido: z.boolean(),
});

export const CreateConduceEquipoPesadoSchema = z.object({
   tipo_conduce: z.literal("EQUIPO_PESADO"),
   ...camposComunes,
   horario_manana_inicio: z.string().nullable().optional(),
   horario_manana_fin: z.string().nullable().optional(),
   horario_tarde_inicio: z.string().nullable().optional(),
   horario_tarde_fin: z.string().nullable().optional(),
   total_horas: z.number().min(0.01, "Debe registrar al menos un horario"),
   combustible_pagado_cliente: z.boolean(),
   firma_observante: z.boolean(),
   firma_camionero: z.boolean(),
});

export const CreateConduceDTOSchema = z.discriminatedUnion("tipo_conduce", [
   CreateConduceCamionSchema,
   CreateConduceEquipoPesadoSchema,
]);

export type CreateConduceCamionForm = z.infer<typeof CreateConduceCamionSchema>;
export type CreateConduceEquipoPesadoForm = z.infer<typeof CreateConduceEquipoPesadoSchema>;
export type CreateConduceForm = z.infer<typeof CreateConduceDTOSchema>;

// Forma "parcial" usada por el diálogo de edición — mismos campos que la
// creación pero todos opcionales (tipo_conduce no cambia en edición rápida).
export type UpdateConduceForm = Partial<Omit<CreateConduceCamionForm, "tipo_conduce">> &
   Partial<Omit<CreateConduceEquipoPesadoForm, "tipo_conduce">> & {
      tipo_conduce?: (typeof TIPO_CONDUCE)[number];
   };

// ─── Lectura ─────────────────────────────────────────────────────────────
interface ConduceBaseDTO {
   id: string;
   numero_referencia: string;
   fecha: string;
   proyecto_id: string | null;
   proyecto_nombre?: string;
   cliente_id: string;
   cliente_nombre?: string;
   cliente_telefono: string | null;
   equipo_id: string;
   equipo_nombre?: string;
   operador_id: string;
   operador_nombre?: string;
   categoria_equipo_id: string;
   categoria_equipo_nombre?: string;
   categoria_equipo_tarifa_id: string | null;
   categoria_equipo_tarifa_nombre: string;
   medida_cobro_nombre: string;
   es_cobrable: boolean;
   observaciones: string | null;
   precio_unitario: number;
   subtotal: number;
   created_by_name?: string;
   created_at: string;
   updated_at: string;
   // Eliminación lógica
   deleted_by_name?: string;
   deleted_at: string | null;
   deleted_reason: string | null;
}

export type ConduceCamionDTO = ConduceBaseDTO & {
   tipo_conduce: "CAMION";
   procedencia: string;
   destino: string;
   cantidad: number;
   firma_chofer: boolean;
   firma_recibido: boolean;
};

export type ConduceEquipoPesadoDTO = ConduceBaseDTO & {
   tipo_conduce: "EQUIPO_PESADO";
   horario_manana_inicio: string | null;
   horario_manana_fin: string | null;
   horario_tarde_inicio: string | null;
   horario_tarde_fin: string | null;
   total_horas: number;
   combustible_pagado_cliente: boolean;
   firma_observante: boolean;
   firma_camionero: boolean;
};

export type ConduceDTO = ConduceCamionDTO | ConduceEquipoPesadoDTO;
export type TipoConduce = ConduceDTO["tipo_conduce"];

export interface ConduceFiltros {
   proyecto_id?: string;
   empleado_id?: string;
   equipo_id?: string;
   cliente_id?: string;
   tipo_conduce?: TipoConduce;
   es_cobrable?: boolean;
   /** "YYYY-MM-DD" — igual al value de un <input type="date">. */
   fecha_desde?: string;
   fecha_hasta?: string;
   busqueda?: string;
   /** true = solo eliminados (para el futuro listado de "eliminados"); false/undefined = solo activos. */
   eliminado?: boolean;
   page?: number;
   pageSize?: number;
}

export interface ConduceListResult {
   data: ConduceDTO[];
   total: number;
   page: number;
   pageSize: number;
}