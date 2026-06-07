import { Hono } from "hono";
import db from "@/backend/database";
import { KyselySupplierRepository } from "../infraestructure/supplier.infraestructure";
import { SupplierService } from "../service/supplier.service";

const suppliersRoute = new Hono();
const repo = new KyselySupplierRepository(db);
const service = new SupplierService(repo);

// GET /api/suppliers
suppliersRoute.get("/", async (c) => {
   const suppliers = await service.getAll();
   return c.json(suppliers);
});

// GET /api/suppliers/:id
suppliersRoute.get("/:id", async (c) => {
   const supplier = await service.getById(c.req.param("id"));
   if (!supplier) return c.json({ error: "Proveedor no encontrado" }, 404);
   return c.json(supplier);
});

// POST /api/suppliers
suppliersRoute.post("/", async (c) => {
   const body = await c.req.json();
   try {
      const supplier = await service.create(body);
      return c.json(supplier, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// PATCH /api/suppliers/:id
suppliersRoute.patch("/:id", async (c) => {
   const body = await c.req.json();
   try {
      const supplier = await service.update(c.req.param("id"), body);
      if (!supplier) return c.json({ error: "Proveedor no encontrado" }, 404);
      return c.json(supplier);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// DELETE /api/suppliers/:id
suppliersRoute.delete("/:id", async (c) => {
   const deleted = await service.delete(c.req.param("id"));
   if (!deleted) return c.json({ error: "Proveedor no encontrado" }, 404);
   return c.json({ success: true });
});

export default suppliersRoute;
