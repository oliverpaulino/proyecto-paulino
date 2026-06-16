import { Hono } from "hono";
import db from "@/backend/database";
import {
   KyselyPayrollConceptRepository,
   KyselyPayrollConceptRuleRepository,
   KyselyPayrollItemRepository,
} from "../infraestructure/payroll-concept.infraestructure";
import {
   PayrollConceptService,
   PayrollConceptRuleService,
   PayrollItemService,
} from "../service/payroll-concept.service";
import { PayrollConceptEngine } from "../engine/payroll-concept.engine";
import type { FindBestMatchParams, LocationFilter, TriggerType } from "../domain/payroll-concept.domain";

const conceptRepo = new KyselyPayrollConceptRepository(db);
const ruleRepo = new KyselyPayrollConceptRuleRepository(db);
const itemRepo = new KyselyPayrollItemRepository(db);

const conceptService = new PayrollConceptService(conceptRepo);
const ruleService = new PayrollConceptRuleService(ruleRepo);
const itemService = new PayrollItemService(itemRepo);
const engine = new PayrollConceptEngine(ruleRepo, itemRepo);

const payrollConceptsRoute = new Hono();

// ─── /concepts ────────────────────────────────────────────────────────────────

payrollConceptsRoute.get("/concepts", async (c) => {
   const concepts = await conceptService.list();
   return c.json(concepts);
});

payrollConceptsRoute.post("/concepts", async (c) => {
   const body = await c.req.json();
   try {
      const concept = await conceptService.create(body);
      return c.json(concept, 201);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

payrollConceptsRoute.get("/concepts/:id", async (c) => {
   const concept = await conceptService.getById(c.req.param("id"));
   if (!concept) return c.json({ error: "Concepto no encontrado" }, 404);
   return c.json(concept);
});

payrollConceptsRoute.patch("/concepts/:id", async (c) => {
   const body = await c.req.json();
   try {
      const concept = await conceptService.update(c.req.param("id"), body);
      if (!concept) return c.json({ error: "Concepto no encontrado" }, 404);
      return c.json(concept);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

payrollConceptsRoute.delete("/concepts/:id", async (c) => {
   const ok = await conceptService.deactivate(c.req.param("id"));
   if (!ok) return c.json({ error: "Concepto no encontrado" }, 404);
   return c.json({ success: true });
});

// ─── /concept-rules ───────────────────────────────────────────────────────────

payrollConceptsRoute.get("/concept-rules", async (c) => {
   const conceptId = c.req.query("concept_id");
   const rules = await ruleService.list(conceptId);
   return c.json(rules);
});

// Reglas aplicables a un ciclo dado (requiere cycle_id y trigger en query)
payrollConceptsRoute.get("/concept-rules/applicable", async (c) => {
   const trigger = c.req.query("trigger") as TriggerType | undefined;
   const refDateStr = c.req.query("ref_date");
   const employeeId = c.req.query("employee_id");
   const projectId = c.req.query("project_id");
   const locationType = c.req.query("location_type") as LocationFilter | undefined;

   if (!trigger || !refDateStr) {
      return c.json({ error: "Se requieren trigger y ref_date" }, 400);
   }

   const params: FindBestMatchParams = {
      trigger,
      refDate: new Date(refDateStr),
      employeeId,
      projectId,
      projectLocationType: locationType,
   };

   try {
      const rules = await ruleService.findApplicable(params);
      return c.json(rules);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

payrollConceptsRoute.post("/concept-rules", async (c) => {
   const body = await c.req.json();
   try {
      const rule = await ruleService.create(body);
      return c.json(rule, 201);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

payrollConceptsRoute.patch("/concept-rules/:id", async (c) => {
   const body = await c.req.json();
   try {
      const rule = await ruleService.update(c.req.param("id"), body);
      if (!rule) return c.json({ error: "Regla no encontrada" }, 404);
      return c.json(rule);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

payrollConceptsRoute.delete("/concept-rules/:id", async (c) => {
   const ok = await ruleService.deactivate(c.req.param("id"));
   if (!ok) return c.json({ error: "Regla no encontrada" }, 404);
   return c.json({ success: true });
});

// ─── /items ───────────────────────────────────────────────────────────────────

// Items agregados por empleado en un ciclo
payrollConceptsRoute.get("/items/by-employee/:cycleId", async (c) => {
   const rows = await itemService.listByCycle(c.req.param("cycleId"));
   // Agrupa por employee y suma amounts con signo
   const byEmployee = new Map<string, number>();
   for (const r of rows) {
      const prev = byEmployee.get(r.employee_id) ?? 0;
      byEmployee.set(r.employee_id, prev + r.amount * r.sign);
   }
   const result = Array.from(byEmployee.entries()).map(([employee_id, total]) => ({
      employee_id,
      total,
   }));
   return c.json(result);
});

// Resumen completo (gross / deductions / total) por empleado
payrollConceptsRoute.get("/items/aggregate/:cycleId/:empId", async (c) => {
   try {
      const result = await engine.aggregateForEmployee(
         c.req.param("cycleId"),
         c.req.param("empId")
      );
      return c.json(result);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// Crear item manual
payrollConceptsRoute.post("/items/manual", async (c) => {
   const body = await c.req.json();
   try {
      const item = await itemService.createManual(body);
      return c.json(item, 201);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// Historial de items de un empleado
payrollConceptsRoute.get("/items/history/:employeeId", async (c) => {
   const from = c.req.query("from") ? new Date(c.req.query("from")!) : undefined;
   const to = c.req.query("to") ? new Date(c.req.query("to")!) : undefined;
   const items = await itemService.listByEmployee(c.req.param("employeeId"), from, to);
   return c.json(items);
});

// Items del ciclo filtrados por empleado
payrollConceptsRoute.get("/items/concept/:cycleId/:empId", async (c) => {
   const items = await itemService.listByEmployeeAndCycle(
      c.req.param("cycleId"),
      c.req.param("empId")
   );
   return c.json(items);
});

// Todos los items de un ciclo
payrollConceptsRoute.get("/items/concept/:cycleId", async (c) => {
   const items = await itemService.listByCycle(c.req.param("cycleId"));
   return c.json(items);
});

// Editar item (recalcula amount a partir de quantity y unit_value)
payrollConceptsRoute.patch("/items/concept/:itemId", async (c) => {
   const body = await c.req.json();
   try {
      const item = await itemService.update(c.req.param("itemId"), body);
      if (!item) return c.json({ error: "Item no encontrado" }, 404);
      return c.json(item);
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

// Eliminar item manual
payrollConceptsRoute.delete("/items/concept/:itemId", async (c) => {
   const ok = await itemService.delete(c.req.param("itemId"));
   if (!ok) return c.json({ error: "Item no encontrado" }, 404);
   return c.json({ success: true });
});

// Reemplaza todos los items de (employee, concept) en el ciclo con un único monto
payrollConceptsRoute.put("/items/aggregate/:cycleId/:empId/:conceptId", async (c) => {
   const body = await c.req.json();
   try {
      await itemService.upsertAggregated(
         c.req.param("cycleId"),
         c.req.param("empId"),
         c.req.param("conceptId"),
         Number(body.amount)
      );
      return c.json({ success: true });
   } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Error desconocido" }, 400);
   }
});

export default payrollConceptsRoute;
