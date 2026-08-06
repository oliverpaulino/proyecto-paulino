import { Kysely, sql } from "kysely";
import type { DB } from "@/backend/database";

/**
 * Suma un día a un string "YYYY-MM-DD" y devuelve otro string "YYYY-MM-DD".
 * Igual que en conduce.infraestructure.ts: se usa para volver el filtro
 * "hasta" exclusivo del día SIGUIENTE (`fecha < hasta+1`) sin pasar por
 * `new Date()` (evita el corrimiento de un día por timezone).
 */
function siguienteDiaISO(fechaISO: string): string {
   const [y, m, d] = fechaISO.split("-").map(Number);
   const utc = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
   utc.setUTCDate(utc.getUTCDate() + 1);
   return utc.toISOString().slice(0, 10);
}

const num = (v: unknown): number => Number(v ?? 0) || 0;

function buildCodigoOrdenCompra(referencia: number | null, fecha: Date | string | null): string {
   if (referencia == null) return "—";
   const d = fecha ? new Date(fecha) : new Date();
   const yy = String(d.getFullYear()).slice(-2);
   const mm = String(d.getMonth() + 1).padStart(2, "0");
   const dd = String(d.getDate()).padStart(2, "0");
   const ref = String(referencia).padStart(3, "0");
   return `OC-${yy}${mm}${dd}-${ref}`;
}

function buildCodigo(prefix: string, referencia: number | null): string {
   if (referencia == null) return "—";
   return `${prefix}-${String(referencia).padStart(3, "0")}`;
}

const ETIQUETA_MES = new Intl.DateTimeFormat("es-DO", { month: "short", year: "2-digit" });

function etiquetaMes(clave: string): string {
   const [y, m] = clave.split("-").map(Number);
   return ETIQUETA_MES.format(new Date(y, m - 1, 1));
}

export interface EquipoRentabilidadParams {
   desde?: string; // "YYYY-MM-DD"
   hasta?: string; // "YYYY-MM-DD"
}

/**
 * Reporte de rentabilidad de un equipo en un rango de fechas. Une toda la
 * información financiera atada al equipo:
 *   - Conduces (facturado al cliente vs. costo del operador)
 *   - Gastos (gasto.equipo_id)
 *   - Órdenes de compra (orden_compra_item.equipo_id)
 *   - Mantenimientos
 *   - Pagos vinculados (vía gasto / deducción / orden de compra)
 */
export async function getEquipoRentabilidad(
   db: Kysely<DB>,
   equipoId: string,
   params: EquipoRentabilidadParams = {}
) {
   const { desde, hasta } = params;
   const desdeExcl = hasta ? siguienteDiaISO(hasta) : undefined;

   // ── Conduces ───────────────────────────────────────────────────────────
   const empleadoEfectivo = sql<string>`
      coalesce(conduce.empleado_id, operador.empleado_id, eq_op.empleado_id)
   `;

   const conducesRows = await db
      .selectFrom("conduce")
      .leftJoin("operador", "operador.id", "conduce.operador_id")
      .leftJoin("equipo", "equipo.id", "conduce.equipo_id")
      .leftJoin("operador as eq_op", "eq_op.id", "equipo.operador_id")
      .leftJoin("empleado", (join) =>
         join.on(
            sql.ref("empleado.id"),
            "=",
            sql`coalesce(conduce.empleado_id, operador.empleado_id, eq_op.empleado_id)`
         )
      )
      .leftJoin("cliente", "cliente.id", "conduce.cliente_id")
      .leftJoin("proyecto", "proyecto.id", "conduce.proyecto_id")
      .select([
         "conduce.id",
         "conduce.numero_referencia",
         "conduce.fecha",
         "conduce.tipo_conduce",
         "conduce.es_cobrable",
         "conduce.precio_unitario",
         "conduce.subtotal",
         "conduce.categoria_equipo_tarifa_nombre",
         "conduce.categoria_equipo_tarifa_id",
         "conduce.medida_cobro_nombre",
         sql<number>`coalesce(conduce.cantidad, conduce.total_horas)`.as("cantidad"),
         empleadoEfectivo.as("empleado_id"),
         "conduce.proyecto_id",
         "empleado.nombre as operador_nombre",
         "cliente.nombre as cliente_nombre",
         "proyecto.nombre as proyecto_nombre",
      ])
      .where("conduce.equipo_id", "=", equipoId)
      .where("conduce.deleted_at", "is", null)
      .$if(!!desde, (q: any) => q.where("conduce.fecha", ">=", desde))
      .$if(!!desdeExcl, (q: any) => q.where("conduce.fecha", "<", desdeExcl))
      .orderBy("conduce.fecha", "desc")
      .execute();

   // Resolver el monto que se le paga AL OPERADOR por cada conduce, con las
   // mismas reglas que usa la nómina:
   //   - monto_pago de `proyecto_empleado_tarifa` por (proyecto, empleado,
   //     tarifa) si el conduce tiene proyecto: la tarifa del proyecto gana.
   //   - si no hay tarifa de proyecto, monto_pago de
   //     `empleado_categoria_tarifa` por (empleado, tarifa) — la base.
   //   - si el conduce perdió el id de la tarifa, se recupera por nombre único
   const empleados = [...new Set(conducesRows.map((c) => c.empleado_id).filter(Boolean))];
   const proyectos = [...new Set(conducesRows.map((c: any) => c.proyecto_id).filter(Boolean))];

   const [tarifasEmpleadoRows, tarifasProyectoRows, catalogoTarifasRows] = await Promise.all([
      empleados.length > 0
         ? db
              .selectFrom("empleado_categoria_tarifa")
              .select(["empleado_id", "categoria_equipo_tarifa_id", "monto_pago"])
              .where("empleado_id", "in", empleados)
              .execute()
         : Promise.resolve([]),
      proyectos.length > 0 && empleados.length > 0
         ? db
              .selectFrom("proyecto_empleado_tarifa")
              .select(["proyecto_id", "empleado_id", "categoria_equipo_tarifa_id", "monto_pago"])
              .where("proyecto_id", "in", proyectos)
              .where("empleado_id", "in", empleados)
              .execute()
         : Promise.resolve([]),
      db.selectFrom("categoria_equipo_tarifa").select(["id", "nombre"]).execute(),
   ]);

   const montoPorEmpleadoTarifa = new Map<string, number>();
   for (const t of tarifasEmpleadoRows) {
      montoPorEmpleadoTarifa.set(`${t.empleado_id}::${t.categoria_equipo_tarifa_id}`, num(t.monto_pago));
   }

   // Tarifa específica del proyecto: `proyecto_id::empleado_id::tarifa_id`.
   const montoPorProyectoEmpleadoTarifa = new Map<string, number>();
   for (const t of tarifasProyectoRows) {
      montoPorProyectoEmpleadoTarifa.set(
         `${t.proyecto_id}::${t.empleado_id}::${t.categoria_equipo_tarifa_id}`,
         num(t.monto_pago)
      );
   }

   // Nombres de tarifa únicos → id (solo los que no son ambiguos).
   const nombres = new Map<string, string[]>();
   for (const t of catalogoTarifasRows) {
      const k = (t.nombre ?? "").trim().toLowerCase();
      nombres.set(k, [...(nombres.get(k) ?? []), t.id]);
   }
   const tarifaIdPorNombreUnico = new Map<string, string>();
   for (const [nombre, ids] of nombres) {
      if (ids.length === 1) tarifaIdPorNombreUnico.set(nombre, ids[0]);
   }

   const conduces = conducesRows.map((r: any) => {
      const tarifaId =
         r.categoria_equipo_tarifa_id ??
         tarifaIdPorNombreUnico.get((r.categoria_equipo_tarifa_nombre ?? "").trim().toLowerCase()) ??
         null;
      const montoPago =
         r.empleado_id && tarifaId
            ? montoPorProyectoEmpleadoTarifa.get(`${r.proyecto_id}::${r.empleado_id}::${tarifaId}`) ??
              montoPorEmpleadoTarifa.get(`${r.empleado_id}::${tarifaId}`) ??
              0
            : 0;
      const cantidad = num(r.cantidad);
      return {
         id: r.id,
         numero_referencia: r.numero_referencia,
         fecha: new Date(r.fecha),
         tipo_conduce: r.tipo_conduce,
         cliente_nombre: r.cliente_nombre ?? null,
         proyecto_nombre: r.proyecto_nombre ?? null,
         tarifa_nombre: r.categoria_equipo_tarifa_nombre ?? "Sin tarifa",
         medida_cobro: r.medida_cobro_nombre ?? "unidad",
         cantidad,
         es_cobrable: !!r.es_cobrable,
         subtotal: num(r.subtotal),
         operador_nombre: r.operador_nombre ?? null,
         monto_pago_operador: montoPago,
         costo_operador: cantidad * montoPago,
      };
   });

   // ── Gastos ──────────────────────────────────────────────────────────────
   const gastosRows = await db
      .selectFrom("gasto")
      .innerJoin("categoria_gasto", "categoria_gasto.id", "gasto.categoria_gasto_id")
      .leftJoin("orden_compra", "orden_compra.id", "gasto.orden_compra_id")
      .leftJoin("proyecto", "proyecto.id", "gasto.proyecto_id")
      .leftJoin("equipo", "equipo.id", "gasto.equipo_id")
      .selectAll("gasto")
      .select([
         "categoria_gasto.nombre as categoria_gasto_nombre",
         "categoria_gasto.grupo as categoria_gasto_grupo",
         "orden_compra.referencia as orden_compra_codigo_referencia",
         "proyecto.referencia as proyecto_codigo_referencia",
         "equipo.referencia as equipo_codigo_referencia",
      ])
      .where("gasto.equipo_id", "=", equipoId)
      .where("gasto.deleted_at", "is", null)
      .$if(!!desde, (q: any) => q.where("gasto.fecha", ">=", desde))
      .$if(!!desdeExcl, (q: any) => q.where("gasto.fecha", "<", desdeExcl))
      .orderBy("gasto.fecha", "desc")
      .execute();

   const gastos = gastosRows.map((r: any) => ({
      id: r.id,
      referencia: num(r.referencia),
      codigoReferencia: buildCodigo("GAS", r.referencia),
      monto_total: num(r.monto_total),
      concepto: r.concepto,
      ncf: r.ncf ?? null,
      categoria_gasto_id: r.categoria_gasto_id,
      categoria_gasto_nombre: r.categoria_gasto_nombre,
      categoria_gasto_grupo: r.categoria_gasto_grupo,
      orden_compra_id: r.orden_compra_id ?? null,
      orden_compra_codigo_referencia: r.orden_compra_codigo_referencia
         ? buildCodigo("OC", r.orden_compra_codigo_referencia)
         : null,
      proyecto_id: r.proyecto_id ?? null,
      proyecto_codigo_referencia: r.proyecto_codigo_referencia
         ? buildCodigo("PRO", r.proyecto_codigo_referencia)
         : null,
      equipo_id: r.equipo_id ?? null,
      equipo_codigo_referencia: r.equipo_codigo_referencia ? buildCodigo("EQU", r.equipo_codigo_referencia) : null,
      cobrable_proyecto: !!r.cobrable_proyecto,
      cobrable_monto: r.cobrable_monto != null ? num(r.cobrable_monto) : null,
      fecha: new Date(r.fecha),
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
      deleted_by: r.deleted_by ?? null,
      deleted_at: r.deleted_at ? new Date(r.deleted_at) : null,
      deleted_reason: r.deleted_reason ?? null,
   }));

   // ── Órdenes de compra ──────────────────────────────────────────────────
   const comprasRows = await db
      .selectFrom("orden_compra_item")
      .innerJoin("orden_compra", "orden_compra.id", "orden_compra_item.orden_compra_id")
      .select([
         "orden_compra_item.id",
         "orden_compra_item.orden_compra_id",
         "orden_compra.fecha as orden_fecha",
         "orden_compra.estado as orden_estado",
         "orden_compra.referencia as orden_referencia",
         "orden_compra_item.descripcion",
         "orden_compra_item.cantidad",
         "orden_compra_item.precio_unitario",
         "orden_compra_item.subtotal",
      ])
      .where("orden_compra_item.equipo_id", "=", equipoId)
      .where("orden_compra.deleted_at", "is", null)
      .$if(!!desde, (q: any) => q.where("orden_compra.fecha", ">=", desde))
      .$if(!!desdeExcl, (q: any) => q.where("orden_compra.fecha", "<", desdeExcl))
      .orderBy("orden_compra.fecha", "desc")
      .execute();

   const compras = comprasRows.map((r: any) => ({
      id: r.id,
      orden_compra_id: r.orden_compra_id,
      orden_codigo: buildCodigoOrdenCompra(num(r.orden_referencia), r.orden_fecha),
      fecha: new Date(r.orden_fecha),
      estado: r.orden_estado,
      descripcion: r.descripcion,
      cantidad: num(r.cantidad),
      precio_unitario: num(r.precio_unitario),
      subtotal: num(r.subtotal),
   }));

   // ── Mantenimientos ─────────────────────────────────────────────────────
   const mantRows = await db
      .selectFrom("mantenimiento")
      .select(["id", "tipo", "estado", "descripcion", "costo", "fecha_inicio", "fecha_fin"])
      .where("mantenimiento.equipo_id", "=", equipoId)
      .$if(!!desde, (q: any) => q.where("mantenimiento.fecha_inicio", ">=", desde))
      .$if(!!desdeExcl, (q: any) => q.where("mantenimiento.fecha_inicio", "<", desdeExcl))
      .orderBy("mantenimiento.fecha_inicio", "desc")
      .execute();

   const mantenimientos = mantRows.map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      estado: r.estado,
      descripcion: r.descripcion,
      costo: r.costo != null ? num(r.costo) : null,
      fecha_inicio: new Date(r.fecha_inicio),
      fecha_fin: r.fecha_fin ? new Date(r.fecha_fin) : null,
   }));

   // ── Pagos vinculados ───────────────────────────────────────────────────
   const pagosRows = await db
      .selectFrom("pago")
      .leftJoin("gasto", "gasto.id", "pago.gasto_empresa_id")
      .leftJoin("deduccion", "deduccion.id", "pago.deduccion_empleado_id")
      .leftJoin("orden_compra", "orden_compra.id", "pago.orden_compra_id")
      .select([
         "pago.id",
         "pago.referencia",
         "pago.fecha",
         "pago.concepto",
         "pago.tipo_movimiento",
         "pago.metodo_pago",
         "pago.monto_pagado",
         "gasto.referencia as gasto_referencia",
         "deduccion.referencia as deduccion_referencia",
         "orden_compra.referencia as orden_compra_referencia",
         "orden_compra.fecha as orden_compra_fecha",
      ])
      .where((eb) =>
         eb.or([
            eb.exists(
               db
                  .selectFrom("gasto")
                  .select("gasto.id")
                  .where(sql.ref("gasto.id"), "=", sql.ref("pago.gasto_empresa_id"))
                  .where("gasto.equipo_id", "=", equipoId)
            ),
            eb.exists(
               db
                  .selectFrom("deduccion")
                  .select("deduccion.id")
                  .where(sql.ref("deduccion.id"), "=", sql.ref("pago.deduccion_empleado_id"))
                  .where("deduccion.equipo_id", "=", equipoId)
            ),
            eb.exists(
               db
                  .selectFrom("orden_compra_item")
                  .select("orden_compra_item.id")
                  .where(sql.ref("orden_compra_item.orden_compra_id"), "=", sql.ref("pago.orden_compra_id"))
                  .where("orden_compra_item.equipo_id", "=", equipoId)
            ),
         ])
      )
      .where("pago.deleted_at", "is", null)
      .$if(!!desde, (q: any) => q.where("pago.fecha", ">=", desde))
      .$if(!!desdeExcl, (q: any) => q.where("pago.fecha", "<", desdeExcl))
      .orderBy("pago.fecha", "desc")
      .execute();

   const pagos = pagosRows.map((r: any) => {
      const destino =
         (r.gasto_referencia != null ? buildCodigo("GAS", r.gasto_referencia) : null) ??
         (r.deduccion_referencia != null ? buildCodigo("DED", r.deduccion_referencia) : null) ??
         (r.orden_compra_referencia != null
            ? buildCodigoOrdenCompra(num(r.orden_compra_referencia), r.orden_compra_fecha)
            : null);
      return {
         id: r.id,
         codigo_referencia: buildCodigo("PAG", r.referencia),
         fecha: new Date(r.fecha),
         concepto: r.concepto,
         tipo_movimiento: r.tipo_movimiento,
         metodo_pago: r.metodo_pago,
         monto_pagado: num(r.monto_pagado),
         destino,
      };
   });

   // ── Resumen ────────────────────────────────────────────────────────────
   const ingresos = conduces.filter((c) => c.es_cobrable).reduce((s, c) => s + c.subtotal, 0);
   const costoOperador = conduces.reduce((s, c) => s + c.costo_operador, 0);
   const gastosTotal = gastos.reduce((s, g) => s + g.monto_total, 0);
   const mantTotal = mantenimientos.reduce((s, m) => s + (m.costo ?? 0), 0);
   const comprasTotal = compras.reduce((s, c) => s + c.subtotal, 0);
   const pagosSalida = pagos.filter((p) => p.tipo_movimiento === "SALIDA").reduce((s, p) => s + p.monto_pagado, 0);
   const pagosEntrada = pagos.filter((p) => p.tipo_movimiento === "ENTRADA").reduce((s, p) => s + p.monto_pagado, 0);

   const rentabilidadOperativa = ingresos - costoOperador - gastosTotal - mantTotal;
   const rentabilidadNeta = rentabilidadOperativa - comprasTotal;
   const margenOperativo = ingresos > 0 ? (rentabilidadOperativa / ingresos) * 100 : 0;

   // ── Por mes ────────────────────────────────────────────────────────────
   const clavesMes = new Set<string>();
   const porMes = new Map<string, { ingresos: number; costosOperativos: number; compras: number }>();

   const agregarMes = (clave: string, ingresos: number, costos: number, compras: number) => {
      clavesMes.add(clave);
      const previo = porMes.get(clave) ?? { ingresos: 0, costosOperativos: 0, compras: 0 };
      porMes.set(clave, {
         ingresos: previo.ingresos + ingresos,
         costosOperativos: previo.costosOperativos + costos,
         compras: previo.compras + compras,
      });
   };

   const claveMes = (fecha: Date) => {
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
   };

   for (const c of conduces) {
      if (c.es_cobrable) agregarMes(claveMes(c.fecha), c.subtotal, c.costo_operador, 0);
      else agregarMes(claveMes(c.fecha), 0, c.costo_operador, 0);
   }
   for (const g of gastos) agregarMes(claveMes(g.fecha), 0, g.monto_total, 0);
   for (const m of mantenimientos) {
      if (m.costo) agregarMes(claveMes(m.fecha_inicio), 0, m.costo, 0);
   }
   for (const c of compras) agregarMes(claveMes(c.fecha), 0, 0, c.subtotal);

   const porMesArray = [...clavesMes]
      .sort()
      .map((clave) => {
         const v = porMes.get(clave)!;
         return {
            mes: clave,
            etiqueta: etiquetaMes(clave),
            ingresos: v.ingresos,
            costos_operativos: v.costosOperativos,
            utilidad: v.ingresos - v.costosOperativos,
            compras: v.compras,
         };
      });

   // ── Por tarifa ─────────────────────────────────────────────────────────
   const porTarifaMap = new Map<string, { tarifa_nombre: string; medida_cobro: string; count: number; cantidad: number; subtotal_facturado: number; costo_operador: number }>();
   for (const c of conduces) {
      const clave = `${c.tarifa_nombre}::${c.medida_cobro}`;
      const previo = porTarifaMap.get(clave) ?? {
         tarifa_nombre: c.tarifa_nombre,
         medida_cobro: c.medida_cobro,
         count: 0,
         cantidad: 0,
         subtotal_facturado: 0,
         costo_operador: 0,
      };
      previo.count += 1;
      previo.cantidad += c.cantidad;
      previo.subtotal_facturado += c.subtotal;
      previo.costo_operador += c.costo_operador;
      porTarifaMap.set(clave, previo);
   }
   const porTarifa = [...porTarifaMap.values()].sort((a, b) => b.subtotal_facturado - a.subtotal_facturado);

   // ── Por categoría de gasto ─────────────────────────────────────────────
   const porCatGastoMap = new Map<string, { categoria: string; grupo: string; count: number; total: number }>();
   for (const g of gastos) {
      const clave = `${g.categoria_gasto_nombre}::${g.categoria_gasto_grupo}`;
      const previo = porCatGastoMap.get(clave) ?? {
         categoria: g.categoria_gasto_nombre,
         grupo: g.categoria_gasto_grupo,
         count: 0,
         total: 0,
      };
      previo.count += 1;
      previo.total += g.monto_total;
      porCatGastoMap.set(clave, previo);
   }
   const porCategoriaGasto = [...porCatGastoMap.values()].sort((a, b) => b.total - a.total);

   return {
      desde: desde ?? null,
      hasta: hasta ?? null,
      resumen: {
         ingresos,
         conduces_totales: conduces.length,
         conduces_cobrables: conduces.filter((c) => c.es_cobrable).length,
         costo_operador: costoOperador,
         gastos: gastosTotal,
         mantenimientos: mantTotal,
         compras: comprasTotal,
         pagos_salida: pagosSalida,
         pagos_entrada: pagosEntrada,
         rentabilidad_operativa: rentabilidadOperativa,
         rentabilidad_neta: rentabilidadNeta,
         margen_operativo: margenOperativo,
      },
      por_mes: porMesArray,
      por_tarifa: porTarifa,
      por_categoria_gasto: porCategoriaGasto,
      conduces,
      gastos,
      compras,
      mantenimientos,
      pagos,
   };
}
