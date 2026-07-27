import { Hono } from "hono";
import db from "@/backend/database";
import { KyselyCuentasPorPagarRepository } from "../infraestructure/cuentas-por-pagar.infraestructure";
import { CuentasPorPagarService } from "../service/cuentas-por-pagar.service";
import type {
   EstadoCuenta,
   TipoCuenta,
} from "../domain/cuentas-por-pagar.domain";

const cuentasPorPagarRoute = new Hono();
const repo = new KyselyCuentasPorPagarRepository(db);
const service = new CuentasPorPagarService(repo);

cuentasPorPagarRoute.get("/", async (c) => {
   try {
      const q = c.req.query.bind(c.req);
      const tipo = q("tipo");
      const estado = q("estado");

      const resultado = await service.listar({
         tipo: tipo === "GASTO" || tipo === "COSTO" ? (tipo as TipoCuenta) : undefined,
         estado:
            estado === "PENDIENTE" || estado === "PARCIAL" || estado === "PAGADO"
               ? (estado as EstadoCuenta)
               : undefined,
         incluir_pagadas: q("incluir_pagadas") === "true",
         proyecto_id: q("proyecto_id") || undefined,
         categoria_gasto_id: q("categoria_gasto_id") || undefined,
         fecha_desde: q("fecha_desde") ? new Date(q("fecha_desde")!) : undefined,
         fecha_hasta: q("fecha_hasta") ? new Date(q("fecha_hasta")!) : undefined,
         busqueda: q("busqueda") || undefined,
         page: Number(q("page")) || 1,
         pageSize: Number(q("pageSize")) || 25,
      });

      return c.json(resultado);
   } catch (err: unknown) {
      return c.json(
         { error: err instanceof Error ? err.message : "Error al obtener las cuentas por pagar" },
         400
      );
   }
});

export default cuentasPorPagarRoute;
