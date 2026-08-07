import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyCuentasPorCobrarRepository } from "../infraestructure/cuentas-por-cobrar.infraestructure";
import { CuentasPorCobrarService } from "../service/cuentas-por-cobrar.service";
import { RegistrarPagoCxcSchema } from "@/dtos/cuentas-por-cobrar.dto";
import type { EstadoCuenta } from "../domain/cuentas-por-cobrar.domain";
import { auth } from "@/lib/auth";

const cuentasPorCobrarRoute = new Hono();
const repo = new KyselyCuentasPorCobrarRepository(db);
const service = new CuentasPorCobrarService(repo);

// GET /api/cuentas-por-cobrar
// ?cliente_id=&proyecto_id=&estado=&incluir_pagadas=&fecha_desde=&fecha_hasta=&busqueda=&page=&pageSize=
cuentasPorCobrarRoute.get("/", async (c) => {
   try {
      const q = c.req.query.bind(c.req);
      const estado = q("estado");

      const resultado = await service.listar({
         cliente_id: q("cliente_id") || undefined,
         proyecto_id: q("proyecto_id") || undefined,
         estado:
            estado === "PENDIENTE" || estado === "PARCIAL" || estado === "PAGADO"
               ? (estado as EstadoCuenta)
               : undefined,
         incluir_pagadas: q("incluir_pagadas") === "true",
         // Fechas como texto "YYYY-MM-DD" — no pasar por `new Date()`.
         fecha_desde: q("fecha_desde") || undefined,
         fecha_hasta: q("fecha_hasta") || undefined,
         busqueda: q("busqueda") || undefined,
         page: Number(q("page")) || 1,
         pageSize: Number(q("pageSize")) || 25,
      });

      return c.json(resultado);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener las cuentas por cobrar" },
         400
      );
   }
});

// GET /api/cuentas-por-cobrar/cliente/:clienteId
// Detalle de un cliente: sus conduces cobrables, el resumen y el historial de pagos.
cuentasPorCobrarRoute.get("/cliente/:clienteId", async (c) => {
   try {
      const q = c.req.query.bind(c.req);
      const resultado = await service.detalleCliente(c.req.param("clienteId"), {
         proyecto_id: q("proyecto_id") || undefined,
         incluir_pagadas: q("incluir_pagadas") === "true",
         fecha_desde: q("fecha_desde") || undefined,
         fecha_hasta: q("fecha_hasta") || undefined,
         page: Number(q("page")) || 1,
         pageSize: Number(q("pageSize")) || 50,
      });
      return c.json(resultado);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener el detalle del cliente" },
         400
      );
   }
});

// POST /api/cuentas-por-cobrar/pagos
// Pago rápido: monto + cliente, se reparte FIFO entre los conduces pendientes
// (o solo los indicados en `conduce_ids` / con la distribución explícita de `pagos`).
cuentasPorCobrarRoute.post("/pagos", async (c) => {
   try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const rawBody = await c.req.json();
      const validation = RegistrarPagoCxcSchema.safeParse(rawBody);
      if (!validation.success) {
         return c.json(
            { error: "Datos incorrectos", detalles: validation.error.format() },
            400
         );
      }

      const body = validation.data;
      const pagos = await service.registrarPago({
         cliente_id: body.cliente_id,
         monto: body.monto,
         metodo_pago: body.metodo_pago,
         fecha: body.fecha,
         concepto: body.concepto,
         conduce_ids: body.conduce_ids,
         pagos: body.pagos,
         created_by: session.user.id,
      });

      return c.json({ success: true, pagos }, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al registrar el pago" }, 400);
   }
});

export default cuentasPorCobrarRoute;
