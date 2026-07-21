import { IProyectoRepository } from "../../proyectos/domain/proyecto.domain";
import type {
   IConduceRepository,
   CreateConduceDTO,
   UpdateConduceDTO,
   ConduceProps,
   ConduceFiltros,
   ConduceListResult,
} from "../domain/conduce.domain";

export class ConduceService {
   constructor(
      private readonly repo: IConduceRepository,
      private readonly proyectoRepo: IProyectoRepository
   ) { }

   async list(filtros: ConduceFiltros): Promise<ConduceListResult> {
      return this.repo.findAll(filtros);
   }

   async getByProyecto(proyectoId: string): Promise<ConduceProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async create(data: CreateConduceDTO): Promise<ConduceProps> {
      this.#validate(data);
      const conduce = await this.repo.create(data);
      // Solo recalcula el proyecto si el conduce quedó asignado a uno — en
      // el registro general se puede guardar "sin asignar" y vincularlo después.
      if (conduce.proyecto_id) await this.proyectoRepo.recalcularTotales(conduce.proyecto_id);
      return conduce;
   }

   async update(id: string, data: UpdateConduceDTO, proyectoIdAnterior?: string | null): Promise<ConduceProps> {
      if (data.numero_referencia !== undefined && !data.numero_referencia.trim()) {
         throw new Error("El número de referencia es requerido");
      }
      if (data.precio_unitario !== undefined && data.precio_unitario < 0) {
         throw new Error("El precio unitario debe ser mayor o igual a 0");
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

   async remove(id: string): Promise<void> {
      const existing = await this.repo.findById(id);
      await this.repo.delete(id);
      if (existing?.proyecto_id) await this.proyectoRepo.recalcularTotales(existing.proyecto_id);
   }

   #validate(data: CreateConduceDTO): void {
      if (!data.cliente_id) throw new Error("El cliente es requerido");
      if (!data.equipo_id) throw new Error("El equipo es requerido");
      if (!data.categoria_equipo_tarifa_id) throw new Error("La tarifa aplicable es requerida");
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
}