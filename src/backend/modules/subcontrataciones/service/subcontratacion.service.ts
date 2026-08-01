import { Kysely } from "kysely";
import type { DB } from "@/backend/database";
import {
   ISubcontratacionRepository,
   SubcontratacionesFiltros,
   SubcontratacionesResult,
   SubcontratacionProps,
   EstadoTrabajo,
   CreateSubcontratacionDTO,
   UpdateSubcontratacionDTO,
   CrearPagoDTO,
   CrearApunteDTO,
   SubcontratacionApunte,
} from "../domain/subcontratacion.domain";

const ESTADOS_VALIDOS: EstadoTrabajo[] = ["PENDIENTE", "EN_PROGRESO", "TERMINADA", "CANCELADA"];

export class SubcontratacionService {
   constructor(
      private readonly repo: ISubcontratacionRepository,
      private readonly db: Kysely<DB>
   ) {}

   async listar(filtros: SubcontratacionesFiltros): Promise<SubcontratacionesResult> {
      if (filtros.fecha_desde && filtros.fecha_hasta) {
         if (new Date(filtros.fecha_hasta) < new Date(filtros.fecha_desde)) {
            throw new Error("La fecha final no puede ser anterior a la inicial");
         }
      }
      return this.repo.listar(filtros);
   }

   async getById(id: string): Promise<SubcontratacionProps | null> {
      return this.repo.findById(id);
   }

   /** La subcontratación solo existe para proveedores tipo SUB_CONTRATISTA o AMBOS. */
   async create(
      data: CreateSubcontratacionDTO,
      ctx?: { created_by?: string | null; created_by_name?: string | null }
   ): Promise<SubcontratacionProps> {
      if (data.monto_total <= 0) throw new Error("El monto debe ser mayor a 0");
      if (!data.fecha_deuda) throw new Error("La fecha de la deuda es requerida");
      if (!data.categoria_gasto_id) throw new Error("Debe seleccionar una categoría de gasto");
      if (data.estado && !ESTADOS_VALIDOS.includes(data.estado)) {
         throw new Error("Estado de trabajo inválido");
      }

      await this.#validarProveedorSubcontratista(data.proveedor_id);

      return this.repo.create(data, ctx);
   }

   async update(id: string, data: UpdateSubcontratacionDTO): Promise<SubcontratacionProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto debe ser mayor a 0");
      }
      if (data.estado && !ESTADOS_VALIDOS.includes(data.estado)) {
         throw new Error("Estado de trabajo inválido");
      }
      if (data.proveedor_id) {
         await this.#validarProveedorSubcontratista(data.proveedor_id);
      }
      return this.repo.update(id, data);
   }

   async cambiarEstado(id: string, estado: EstadoTrabajo): Promise<SubcontratacionProps | null> {
      if (!ESTADOS_VALIDOS.includes(estado)) throw new Error("Estado de trabajo inválido");
      return this.repo.cambiarEstado(id, estado);
   }

   async pagar(id: string, data: CrearPagoDTO): Promise<SubcontratacionProps | null> {
      if (data.monto_pagado <= 0) throw new Error("El monto del pago debe ser mayor a 0");
      if (!data.fecha) throw new Error("La fecha del pago es requerida");
      return this.repo.pagar(id, data);
   }

   async listarPagos(id: string): Promise<any[]> {
      return this.repo.listarPagos(id);
   }

   async listarApuntes(id: string): Promise<SubcontratacionApunte[]> {
      return this.repo.listarApuntes(id);
   }

   async crearApunte(
      id: string,
      data: CrearApunteDTO,
      ctx?: { created_by_name?: string | null }
   ): Promise<SubcontratacionApunte> {
      if (!data.texto?.trim()) throw new Error("El apunte no puede estar vacío");
      return this.repo.crearApunte(id, data, ctx);
   }

   async delete(
      id: string,
      data?: { deleted_by?: string | null; deleted_reason?: string | null }
   ): Promise<boolean> {
      if (!data?.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de eliminación");
      }
      return this.repo.delete(id, data);
   }

   async restore(id: string): Promise<SubcontratacionProps | null> {
      return this.repo.restore(id);
   }

   async #validarProveedorSubcontratista(proveedorId: string): Promise<void> {
      const p = await this.db
         .selectFrom("proveedor")
         .select(["id", "tipo"])
         .where("id", "=", proveedorId)
         .executeTakeFirst();

      if (!p) throw new Error("El proveedor no existe");
      // Un proveedor SUB_CONTRATISTA o AMBOS puede tener subcontrataciones.
      if (p.tipo !== "SUB_CONTRATISTA" && p.tipo !== "AMBOS") {
         throw new Error("La subcontratación solo aplica a proveedores de tipo Subcontratista o Ambos");
      }
   }
}
