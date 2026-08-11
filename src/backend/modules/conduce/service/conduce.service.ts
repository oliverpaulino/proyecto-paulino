import { IProyectoRepository } from "../../proyectos/domain/proyecto.domain";
import { IEmployeeRepository } from "../../employees/domain/employees.domain";
import type {
   IConduceRepository,
   CreateConduceDTO,
   UpdateConduceDTO,
   ConduceProps,
   ConduceFiltros,
   ConduceListResult,
} from "../domain/conduce.domain";

interface EliminarInfo {
   deletedBy?: string | null;
   deletedByName?: string | null;
   reason?: string | null;
}

export class ConduceService {
   constructor(
      private readonly repo: IConduceRepository,
      private readonly proyectoRepo: IProyectoRepository,
      private readonly employeeRepo: IEmployeeRepository
   ) { }

   async list(filtros: ConduceFiltros): Promise<ConduceListResult> {
      return this.repo.findAll(filtros);
   }

   async getByProyecto(proyectoId: string): Promise<ConduceProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async getCategoriasByProyecto(proyectoId: string): Promise<Array<{ nombre: string; count: number; subtotal: number; subtotalCobrable: number; cobrable_count: number }>> {
      return this.repo.findCategoriasByProyecto(proyectoId);
   }

   async create(data: CreateConduceDTO): Promise<ConduceProps> {
      if (data.proyecto_id) await this.#assertProyectoEditable(data.proyecto_id);

      this.#validate(data);
      await this.#validarFolioUnico(data.numero_referencia);
      await this.#validarOperadorActivo(data.operador_id);
      const conduce = await this.repo.create(data);
      // Solo recalcula el proyecto si el conduce quedó asignado a uno — en
      // el registro general se puede guardar "sin asignar" y vincularlo después.
      if (conduce.proyecto_id) await this.proyectoRepo.recalcularTotales(conduce.proyecto_id);
      return conduce;
   }

   async update(id: string, data: UpdateConduceDTO, proyectoIdAnterior?: string | null): Promise<ConduceProps> {
      const existing = await this.repo.findById(id);
      if (!existing) throw new Error("Conduce no encontrado");

      // Bloqueado si el proyecto al que pertenece (o al que se está moviendo)
      // está COMPLETADO. La política de bloqueo se revisa ANTES de validar.
      // `existing.proyecto_id` cubre el caso de un PATCH directo que omita
      // proyecto_id_anterior.
      await Promise.all(
         [existing.proyecto_id, proyectoIdAnterior, data.proyecto_id]
            .filter((v): v is string => !!v)
            .map((pid) => this.#assertProyectoEditable(pid))
      );

      if (data.numero_referencia !== undefined && !data.numero_referencia.trim()) {
         throw new Error("El número de referencia es requerido");
      }
      if (data.numero_referencia !== undefined && data.numero_referencia.trim()) {
         await this.#validarFolioUnico(data.numero_referencia.trim(), id);
      }
      if (data.precio_unitario !== undefined && data.precio_unitario < 0) {
         throw new Error("El precio unitario debe ser mayor o igual a 0");
      }
      if (data.cantidad !== undefined && data.cantidad <= 0) {
         throw new Error("Los metros/viajes deben ser mayor a 0");
      }
      if (data.total_horas !== undefined && data.total_horas <= 0) {
         throw new Error("El total de horas trabajadas debe ser mayor a 0");
      }

      // Solo se valida cuando el operador cambia: un conduce que se creó con un
      // operador activo y luego ese empleado quedó inactivo, se puede seguir
      // editando (otros campos) sin reasignar. Asignarlo ahora a un inactivo, no.
      if (data.operador_id !== undefined) {
         if (existing.operador_id !== data.operador_id) {
            await this.#validarOperadorActivo(data.operador_id);
         }
      }

      const conduce = await this.repo.update(id, data);

      // Si cambió de proyecto (o se asignó/desasignó), recalcula ambos lados.
      const proyectosAfectados = new Set(
         [proyectoIdAnterior, conduce.proyecto_id].filter((v): v is string => !!v)
      );
      await Promise.all(
         [...proyectosAfectados].map((pid) => this.proyectoRepo.recalcularTotales(pid))
      );

      return conduce;
   }

   /**
    * Eliminación LÓGICA. El conduce se conserva en la base para auditoría y
    * para poder restaurarlo; solo deja de aparecer en los listados y en los
    * totales del proyecto.
    */
   async remove(id: string, info?: EliminarInfo): Promise<void> {
      const existing = await this.repo.findById(id);
      if (!existing) throw new Error("Conduce no encontrado");
      if (existing.deleted_at) throw new Error("Este conduce ya fue eliminado");

      if (existing.proyecto_id) await this.#assertProyectoEditable(existing.proyecto_id);

      await this.repo.delete(id, info);
      if (existing.proyecto_id) await this.proyectoRepo.recalcularTotales(existing.proyecto_id);
   }

    /** Revierte una eliminación lógica y recalcula el proyecto si aplica. */
    async restore(id: string): Promise<ConduceProps> {
       const existing = await this.repo.findById(id);
       if (!existing) throw new Error("Conduce no encontrado");
       if (!existing.deleted_at) throw new Error("Este conduce no está eliminado");

       if (existing.proyecto_id) await this.#assertProyectoEditable(existing.proyecto_id);

       await this.repo.restore(id);
       const restored = await this.repo.findById(id);
       if (restored?.proyecto_id) await this.proyectoRepo.recalcularTotales(restored.proyecto_id);
       return restored!;
    }

    async bulkToggleCobrable(ids: string[], es_cobrable: boolean): Promise<void> {
       if (ids.length === 0) return;

       // Ningún conduce de un proyecto COMPLETADO puede cambiar de cobrable.
       const proyectosAfectados = new Set<string>();
       for (const id of ids) {
          const c = await this.repo.findById(id);
          if (c?.proyecto_id) proyectosAfectados.add(c.proyecto_id);
       }
       await Promise.all(
          [...proyectosAfectados].map((pid) => this.#assertProyectoEditable(pid))
       );

       await this.repo.bulkToggleCobrable(ids, es_cobrable);

       await Promise.all(
          [...proyectosAfectados].map((pid) => this.proyectoRepo.recalcularTotales(pid))
       );
    }

   #validate(data: CreateConduceDTO): void {
      if (!data.cliente_id) throw new Error("El cliente es requerido");
      if (!data.equipo_id) throw new Error("El equipo es requerido");
      // if (!data.categoria_equipo_tarifa_id) throw new Error("La tarifa aplicable es requerida");
      if (!data.numero_referencia?.trim()) throw new Error("El número de referencia es requerido");
      if (!data.fecha) throw new Error("La fecha del conduce es requerida");
      if (data.precio_unitario < 0) throw new Error("El precio unitario debe ser mayor o igual a 0");

      if (data.tipo_conduce === "CAMION") {
         if (!data.procedencia?.trim()) throw new Error("La procedencia es requerida");
         if (!data.destino?.trim()) throw new Error("El destino es requerido");
         if (data.cantidad <= 0) throw new Error("Los metros/viajes deben ser mayor a 0");
      } else {
         if (data.total_horas <= 0) throw new Error("El total de horas trabajadas debe ser mayor a 0");
      }
   }

   /**
    * Un empleado inactivo no puede quedar asignado en un conduce nuevo: se
    * rechaza antes de guardar. `null` no es un operador, se deja pasar.
    */
   async #validarOperadorActivo(operadorId?: string | null): Promise<void> {
      if (!operadorId) return;
      const activo = await this.employeeRepo.isOperadorActivo(operadorId);
      if (activo === null) throw new Error("El operador seleccionado no existe");
      if (activo === false) throw new Error("No se puede registrar un conduce con un operador inactivo");
   }

   /**
    * El folio físico que digita la oficina no puede repetirse entre conduces
    * activos. `excludeId` evita el falso positivo al editar el mismo conduce.
    */
   async #validarFolioUnico(numeroReferencia: string, excludeId?: string): Promise<void> {
      const existe = await this.repo.existsNumeroReferencia(numeroReferencia.trim(), excludeId);
      if (existe) throw new Error(`El folio ${numeroReferencia.trim()} ya está registrado en otro conduce`);
   }

   /**
    * Un conduce no se toca si su proyecto está COMPLETADO. CANCELADO/BORRADOR
    * no bloquean. Mismo mensaje que el guard de las rutas de proyectos.
    */
   async #assertProyectoEditable(proyectoId: string): Promise<void> {
      const estado = await this.proyectoRepo.getEstado(proyectoId);
      if (estado === "COMPLETADO") {
         throw new Error(
            "El proyecto está COMPLETADO y no puede editarse. Cámbialo a otro estado para continuar."
         );
      }
   }
}