import { z } from "zod";

export const TipoProyectoSchema = z.enum(["EXPRESS", "NORMAL", "GRANDE"]);
export const EstadoProyectoSchema = z.enum(["BORRADOR", "COMPLETADO", "CANCELADO", "EN PROGRESO"]);

const ProyectoDetalleSchema = z.object({
   id: z.string(),
   proyecto_id: z.string(),
   descripcion: z.string(),
   cantidad: z.number(),
   precio_unitario: z.number(),
   subtotal: z.number(),
   es_cobrable: z.boolean(),
   created_at: z.coerce.date(),
   updated_at: z.coerce.date(),
});

export const ProyectoEquipoDetalleSchema = z.object({
   id: z.string(),
   equipo_id: z.string(),
   equipo_nombre: z.string().optional(),
   operador_id: z.string().nullable(),
   operador_nombre: z.string().optional(),
   categoria_equipo_id: z.string(),
   categoria_nombre: z.string().optional(),
   cantidad: z.number(),
   precio_acordado: z.number(),
   cobra_en_snapshot: z.string().nullable(),
   subtotal: z.number(),
   es_cobrable: z.boolean(),
});

const ProyectoAsignacionSchema = z.object({
   id: z.string(),
   proyecto_id: z.string(),
   operador_id: z.string(),
   operador_nombre: z.string().optional(),
   equipo_id: z.string(),
   equipo_nombre: z.string().optional(),
   horas_trabajadas: z.number(),
});

export const ProyectoDTO = z.discriminatedUnion("tipo_proyecto", [
   z.object({
      tipo_proyecto: z.literal("EXPRESS"),
      tipo_servicio_id: z.string().nullable(),
      tarifa_servicio: z.number(),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      equiposDetalle: z.array(ProyectoEquipoDetalleSchema).optional(),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
   z.object({
      tipo_proyecto: z.literal("NORMAL"),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
   z.object({
      tipo_proyecto: z.literal("GRANDE"),
      id: z.string(),
      estado: EstadoProyectoSchema,
      cliente_id: z.string(),
      cliente_nombre: z.string().optional(),
      total_cobrable: z.number(),
      total_gasto_interno: z.number(),
      rentabilidad: z.number(),
      notas: z.string().nullable(),
      fecha_inicio: z.coerce.date(),
      fecha_fin: z.coerce.date().nullable(),
      detalle: z.array(ProyectoDetalleSchema),
      asignaciones: z.array(ProyectoAsignacionSchema),
      created_at: z.coerce.date(),
      updated_at: z.coerce.date(),
   }),
]);

const LineItemFormSchema = z.object({
   descripcion: z.string().min(1, "Descripción requerida"),
   cantidad: z.number().positive("Cantidad debe ser mayor a 0"),
   precio_unitario: z.number().min(0, "Precio unitario debe ser >= 0"),
});

export const CreateProyectoExpressFormSchema = z.object({
   cliente_id: z.string().min(1, "El cliente es requerido"),
   tipo_servicio_id: z.string().nullable().optional(),
   tarifa_servicio: z.number().min(0, "La tarifa debe ser >= 0"),
   operador_id: z.string().min(1, "El operador es requerido"),
   equipo_id: z.string().min(1, "El equipo es requerido"),
   horas_trabajadas: z.number().min(0),
   notas: z.string().optional(),

   cargos_cobrables: z.array(LineItemFormSchema).optional(),
   gastos_internos: z.array(LineItemFormSchema).optional(),
});

export const LiquidacionExpressFacadeSchema = z.object({
   proyecto_id: z.string(),
   cliente_nombre: z.string(),
   tarifa_servicio: z.number(),
   cargos_cobrables: z.array(ProyectoDetalleSchema),
   gastos_internos: z.array(ProyectoDetalleSchema),
   total_cobrable: z.number(),
   total_gasto_interno: z.number(),
   rentabilidad: z.number(),
   operador_nombre: z.string(),
   equipo_nombre: z.string(),
   horas_trabajadas: z.number(),
   fecha: z.coerce.date(),
});


// Validamos cada línea de tarifa que el usuario configuró
export const TarifaAcordadaSchema = z.object({
   categoria_equipo_id: z.string(),
   precio_acordado: z.number().positive("El precio debe ser mayor a 0"),
   cobra_en_snapshot: z.string(),
   cobra_minimo_snapshot: z.number()
});

// Validamos los equipos asignados inicialmente
export const EquipoAsignadoSchema = z.object({
   categoria_equipo_id: z.string(), // Necesario para enlazarlo con su tarifa
   equipo_id: z.string(),
   operador_id: z.string().optional(),
   cantidad: z.number().min(0),
   es_cobrable: z.boolean().default(true),
});

// El Payload completo para crear un Proyecto Express
export const CreateProyectoExpressDTOSchema = z.object({
   cliente_id: z.string("Seleccione un cliente válido"),
   nombre: z.string().min(1, "El nombre del proyecto es requerido"),
   notas: z.string().optional(),
   servicio_id: z.string({ message: "ID de servicio inválido" }).nullable().optional(),
   tarifa_servicio: z.number().min(0, "La tarifa debe ser >= 0").optional(),
   fecha_inicio: z.string().datetime().optional(),

   // Arrays con la configuración que el usuario armó en la UI
   tarifas: z.array(TarifaAcordadaSchema).min(1, "Debe agregar al menos una tarifa al proyecto"),
   equipos: z.array(EquipoAsignadoSchema).optional(),

   cargos_cobrables: z.array(z.any()).optional(),
   gastos_internos: z.array(z.any()).optional(),
});






export type CreateProyectoExpressDTO = z.infer<typeof CreateProyectoExpressDTOSchema>;
export type ProyectoEquipoDetalle = z.infer<typeof ProyectoEquipoDetalleSchema>;
export type Proyecto = z.infer<typeof ProyectoDTO>;
export type ProyectoExpressDTO = Extract<Proyecto, { tipo_proyecto: "EXPRESS" }>;
export type ProyectoDetalle = z.infer<typeof ProyectoDetalleSchema>;
export type CreateProyectoExpressForm = z.infer<typeof CreateProyectoExpressFormSchema>;
export type LineItemForm = z.infer<typeof LineItemFormSchema>;
export type LiquidacionExpress = z.infer<typeof LiquidacionExpressFacadeSchema>;
export type TipoProyecto = z.infer<typeof TipoProyectoSchema>;
export type EstadoProyecto = z.infer<typeof EstadoProyectoSchema>;
