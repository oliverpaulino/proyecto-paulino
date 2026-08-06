import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/backend/shared/require-permission";
import { KyselyNominaRepository } from "../infraestructure/nomina.infraestructure";
import { NominaService } from "../service/nomina.service";
import { KyselyNotificationRepository } from "../../notifications/infrastructure/notification.infrastructure";
import { NotificationService } from "../../notifications/service/notification.service";

const nominaRoute = new Hono();
const repo = new KyselyNominaRepository(db);
const service = new NominaService(repo);
const notifRepo = new KyselyNotificationRepository(db);
const notifService = new NotificationService(notifRepo);

const fail = (c: any, err: unknown, fallback: string, status = 400) =>
   c.json({ error: err instanceof Error ? err.message : fallback }, status);

/*
   Permisos del módulo, por peso de la acción y no por verbo HTTP.

   El guard genérico (`requireResourcePermission`) mapea todo POST a `create`,
   lo que igualaría "crear un ciclo" con "cerrarlo". Cerrar genera el gasto
   contable y congela los montos, así que exige `manage`; y escribir montos a
   mano (seguro, deducciones, precio manual) exige `update`, no `create`.

   `read` cubre también list/consult porque son la misma capacidad escrita de
   varias formas según el recurso.

   Se tipan como `MiddlewareHandler` para que Hono siga infiriendo los
   parámetros de ruta (`c.req.param("id")` como string y no string|undefined)
   al encadenarlos antes del handler.
*/
const puedeLeer: MiddlewareHandler = requirePermission("payroll", "read", "list", "consult");
const puedeCrear: MiddlewareHandler = requirePermission("payroll", "create", "manage");
const puedeEditar: MiddlewareHandler = requirePermission("payroll", "update", "manage");
const puedeBorrar: MiddlewareHandler = requirePermission("payroll", "delete", "manage");
/** Cerrar el ciclo: genera el gasto y congela la nómina. */
const puedeCerrar: MiddlewareHandler = requirePermission("payroll", "manage");

/** Quién está haciendo el cambio, para auditar los montos escritos a mano. */
async function usuarioActual(c: any): Promise<string | null> {
   try {
      const s = await auth.api.getSession({ headers: c.req.raw.headers });
      return s?.user?.email ?? s?.user?.id ?? null;
   } catch {
      return null;
   }
}

// ── Ciclos ──────────────────────────────────────────────────────────────────

nominaRoute.get("/cycles", puedeLeer, async (c) => {
   try {
      return c.json(await service.listCycles());
   } catch (err) {
      return fail(c, err, "Error al obtener los ciclos de nómina");
   }
});

nominaRoute.post("/cycles", puedeCrear, async (c) => {
   try {
      const body = await c.req.json();
      return c.json(await service.createCycle(body), 201);
   } catch (err) {
      return fail(c, err, "Error al crear el ciclo");
   }
});

nominaRoute.get("/cycles/:id", puedeLeer, async (c) => {
   try {
      const ciclo = await service.getCycle(c.req.param("id"));
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al obtener el ciclo");
   }
});

nominaRoute.patch("/cycles/:id", puedeEditar, async (c) => {
   try {
      const body = await c.req.json();
      const ciclo = await service.updateCycle(c.req.param("id"), body);
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al actualizar el ciclo");
   }
});

nominaRoute.delete("/cycles/:id", puedeBorrar, async (c) => {
   try {
      const ok = await service.deleteCycle(c.req.param("id"));
      if (!ok) return c.json({ error: "Ciclo no encontrado" }, 404);
      return c.json({ success: true });
   } catch (err) {
      return fail(c, err, "Error al eliminar el ciclo");
   }
});

// ── Cálculo y cierre ────────────────────────────────────────────────────────

/** Recalcula todo el ciclo. Idempotente; respeta el `seguro` ya editado. */
nominaRoute.post("/cycles/:id/calcular", puedeEditar, async (c) => {
   try {
      return c.json(await service.calcularCiclo(c.req.param("id")));
   } catch (err) {
      return fail(c, err, "Error al calcular la nómina");
   }
});

nominaRoute.post("/cycles/:id/cerrar", puedeCerrar, async (c) => {
   try {
      const ciclo = await service.cerrarCiclo(c.req.param("id"));
      if (!ciclo) return c.json({ error: "Ciclo no encontrado" }, 404);

      // Avisar a los administradores: la nómina quedó cerrada y congelada,
      // con su gasto contable generado.
      try {
         const admins = await db
            .selectFrom("user")
            .select(["id"])
            .where("role", "=", "administrador")
            .execute();

         if (admins.length > 0) {
            await notifService.notifyMany(
               admins.map((a) => ({
                  user_id: a.id,
                  title: "Nómina cerrada",
                  message: `La nómina "${ciclo.nombre}" fue cerrada. Los montos quedaron congelados.`,
                  type: "PAYROLL_CLOSED",
                  reference_id: ciclo.id,
                  reference_type: "payroll_cycle",
               }))
            );
         }
      } catch {
         // Notificar no debe fallar el cierre: el ciclo ya quedó guardado.
      }

      return c.json(ciclo);
   } catch (err) {
      return fail(c, err, "Error al cerrar el ciclo");
   }
});

// ── Detalle por empleado ────────────────────────────────────────────────────

nominaRoute.get("/cycles/:id/empleados", puedeLeer, async (c) => {
   try {
      return c.json(await service.listCycleEmployees(c.req.param("id")));
   } catch (err) {
      return fail(c, err, "Error al obtener la nómina del ciclo");
   }
});

/**
 * Detalle de un empleado del ciclo: tarifas y deducciones concretas. Se pide
 * al expandir la fila, no en el listado — ver `getDetalleEmpleado`.
 */
nominaRoute.get("/cycles/:cycleId/empleados/:empleadoId", puedeLeer, async (c) => {
   try {
      const row = await service.getDetalleEmpleado(
         c.req.param("cycleId"),
         c.req.param("empleadoId")
      );
      if (!row) return c.json({ error: "Registro no encontrado" }, 404);
      return c.json(row);
   } catch (err) {
      return fail(c, err, "Error al obtener el detalle del empleado");
   }
});

/** El seguro es un campo libre que se edita a mano; recalcula el neto. */
nominaRoute.patch("/cycle-employees/:id/seguro", puedeEditar, async (c) => {
   try {
      const { seguro } = await c.req.json();
      const row = await service.updateSeguro(c.req.param("id"), Number(seguro));
      if (!row) return c.json({ error: "Registro no encontrado" }, 404);
      return c.json(row);
   } catch (err) {
      return fail(c, err, "Error al actualizar el seguro");
   }
});

/**
 * Agrega una deducción NUEVA al chofer dentro del ciclo. No modifica las
 * existentes: crea una más, con su concepto y fecha, y devuelve la nómina
 * ya actualizada.
 * Body: `{ monto: number, concepto: string, fecha?: string,
 *         cuotas?: number, monto_cuota?: number }`
 */
nominaRoute.post("/cycles/:cycleId/empleados/:empleadoId/deducciones", puedeEditar, async (c) => {
   try {
      const { monto, concepto, fecha, cuotas, monto_cuota } = await c.req.json();
      const row = await service.agregarDeduccion(
         c.req.param("cycleId"),
         c.req.param("empleadoId"),
         {
            monto: Number(monto),
            concepto,
            fecha,
            cuotas: cuotas !== undefined ? Number(cuotas) : undefined,
            monto_cuota: monto_cuota !== undefined ? Number(monto_cuota) : undefined,
         }
      );
      if (!row) return c.json({ error: "Registro no encontrado" }, 404);
      return c.json(row, 201);
   } catch (err) {
      return fail(c, err, "Error al agregar la deducción");
   }
});

/**
 * Cambia la cuota por nómina de una deducción con cuotas y vuelve a aplicar
 * los cobros del ciclo (el monto de esta nómina se actualiza si alcanza).
 * Body: `{ monto_cuota: number }`
 */
nominaRoute.patch(
   "/cycles/:cycleId/empleados/:empleadoId/deducciones/:deduccionId",
   puedeEditar,
   async (c) => {
      try {
         const { monto_cuota } = await c.req.json();
         const row = await service.actualizarCuotaDeduccion(
            c.req.param("cycleId"),
            c.req.param("empleadoId"),
            c.req.param("deduccionId"),
            Number(monto_cuota)
         );
         if (!row) return c.json({ error: "Deducción no encontrada" }, 404);
         return c.json(row);
      } catch (err) {
         return fail(c, err, "Error al actualizar la cuota de la deducción");
      }
   }
);

/**
 * Fija a mano lo que se le paga al chofer por una tarifa que la nómina no
 * puede resolver (el conduce guardó el nombre pero no el id, y ese nombre ya
 * no existe en el catálogo o corresponde a varias categorías).
 *
 * Aplica solo a este empleado en este ciclo y recalcula. No toca el catálogo.
 * Body: `{ tarifa_nombre: string, monto_pago: number, nota?: string }`
 */
nominaRoute.post(
   "/cycles/:cycleId/empleados/:empleadoId/precio-manual",
   puedeEditar,
   async (c) => {
      try {
         const { tarifa_nombre, monto_pago, nota } = await c.req.json();
         return c.json(
            await service.fijarPrecioManual(
               c.req.param("cycleId"),
               c.req.param("empleadoId"),
               {
                  tarifa_nombre,
                  monto_pago: Number(monto_pago),
                  nota: nota ?? null,
                  created_by: await usuarioActual(c),
               }
            ),
            201
         );
      } catch (err) {
         return fail(c, err, "Error al fijar el precio manual");
      }
   }
);

/** Quita el precio manual: la tarifa vuelve a valer lo que diga el catálogo. */
nominaRoute.delete(
   "/cycles/:cycleId/empleados/:empleadoId/precio-manual",
   puedeEditar,
   async (c) => {
      try {
         const nombre = c.req.query("tarifa_nombre");
         if (!nombre) return c.json({ error: "Falta `tarifa_nombre`" }, 400);
         return c.json(
            await service.quitarPrecioManual(
               c.req.param("cycleId"),
               c.req.param("empleadoId"),
               nombre
            )
         );
      } catch (err) {
         return fail(c, err, "Error al quitar el precio manual");
      }
   }
);

/**
 * Cambia lo que el proyecto paga a este chofer por una tarifa. Como la tarifa
 * del proyecto gana sobre la base del empleado, editarla aquí actualiza el
 * proyecto mismo (`proyecto_empleado_tarifa`), recalcula el ciclo y devuelve
 * la fila ya refrescada. Afecta a las próximas nóminas de este chofer en este
 * proyecto, no solo a la actual.
 * Body: `{ proyecto_id: string, categoria_equipo_tarifa_id: string,
 *         monto_pago: number }`
 */
nominaRoute.patch(
   "/cycles/:cycleId/empleados/:empleadoId/tarifa-proyecto",
   puedeEditar,
   async (c) => {
      try {
         const { proyecto_id, categoria_equipo_tarifa_id, monto_pago } = await c.req.json();
         const row = await service.actualizarTarifaProyecto(
            c.req.param("cycleId"),
            c.req.param("empleadoId"),
            {
               proyecto_id,
               categoria_equipo_tarifa_id,
               monto_pago: Number(monto_pago),
            }
         );
         if (!row) return c.json({ error: "Registro no encontrado" }, 404);
         return c.json(row);
      } catch (err) {
         return fail(c, err, "Error al actualizar la tarifa del proyecto");
      }
   }
);

/**
 * Relee las deducciones del período para recoger las que se crearon a mano
 * después de calcular. No toca la producción ni los ajustes manuales.
 */
nominaRoute.post("/cycles/:id/refrescar-deducciones", puedeEditar, async (c) => {
   try {
      return c.json(await service.refrescarDeducciones(c.req.param("id")));
   } catch (err) {
      return fail(c, err, "Error al refrescar las deducciones");
   }
});

export default nominaRoute;
