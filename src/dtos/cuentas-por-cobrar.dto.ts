import { z } from "zod";

export const RegistrarPagoCxcSchema = z.object({
   cliente_id: z.string().min(1, "El cliente es requerido"),
   monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
   metodo_pago: z.enum(["CHEQUE", "EFECTIVO", "TRANSFERENCIA", "TARJETA", "DESCUENTO_NOMINA"]),
   fecha: z.coerce.date().optional(),
   concepto: z.string().optional(),
   // Repartir `monto` (FIFO) solo entre estos conduces.
   conduce_ids: z.array(z.string()).optional(),
   // Repartir `monto` (FIFO) solo entre la tarifa/cargos de estos proyectos.
   proyecto_ids: z.array(z.string()).optional(),
   // Distribución explícita por destino (conduce o proyecto).
   pagos: z
      .array(
         z.object({
            destino_id: z.string().min(1),
            tipo: z.enum(["CONDUCE", "PROYECTO"]),
            monto: z.coerce.number().positive("El monto de cada pago debe ser mayor a 0"),
         })
      )
      .optional(),
}).refine((d) => !(d.pagos && d.pagos.length > 0 && (d.conduce_ids?.length || d.proyecto_ids?.length)), {
   message: "No se pueden combinar pagos explícitos con conduce_ids/proyecto_ids",
   path: ["pagos"],
});

export type RegistrarPagoCxcForm = z.infer<typeof RegistrarPagoCxcSchema>;
