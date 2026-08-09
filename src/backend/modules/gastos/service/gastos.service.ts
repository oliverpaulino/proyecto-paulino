import { IProyectoRepository } from "../../proyectos/domain/proyecto.domain";
import {
   CreateGastoDTO,
   CreateGastoDeduccionDTO,
   DeleteGastoDTO,
   GastoProps,
   IGastoRepository,
   MoveCobrableDTO,
   UpdateGastoDTO,
} from "../domain/gastos.domain";

export class GastoService {
   constructor(
      private readonly repo: IGastoRepository,
      private readonly proyectoRepo: IProyectoRepository,
   ) { }

   /** Recalcula total_cobrable/rentabilidad de los proyectos dados (sin repetir). */
   #recalcularProyectos(ids: Array<string | null | undefined>): Promise<void> {
      const unicos = [...new Set(ids.filter((id): id is string => !!id))];
      return Promise.all(unicos.map((pid) => this.proyectoRepo.recalcularTotales(pid)))
         .then(() => undefined);
   }

   /**
    * Cuando el gasto se factura por cantidad (cantidad > 1 + precio unitario),
    * el monto total se deriva como cantidad × precio unitario. Así monto_total
    * y cobrable_monto siguen siendo la fuente de verdad para deducciones.
    */
   #normalizarItem(data: { monto_total: number; cantidad?: number; monto_unitario?: number | null; cobrable_proyecto?: boolean; cobrable_monto?: number | null }): void {
      if (data.cantidad !== undefined && data.cantidad < 1) {
         throw new Error("La cantidad debe ser al menos 1");
      }
      const porCantidad = (data.cantidad ?? 1) > 1 && data.monto_unitario != null;
      if (porCantidad) {
         data.monto_total = data.cantidad! * data.monto_unitario!;
         if (data.cobrable_proyecto && data.cobrable_monto == null) {
            data.cobrable_monto = data.monto_total;
         }
      }
   }

   async getAll(params?: any): Promise<GastoProps[]> {
      const items = await this.repo.findAll(params);
      return items.map((g) => g.toJSON());
   }

   async getAllDeleted(params?: any): Promise<GastoProps[]> {
      const items = await this.repo.findAllDeleted(params);
      return items.map((g) => g.toJSON());
   }

   async getById(id: string): Promise<GastoProps | null> {
      const item = await this.repo.findById(id);
      return item ? item.toJSON() : null;
   }
   
   async getDeletedById(id: string): Promise<GastoProps | null> {
      const item = await this.repo.findDeletedById(id);
      return item ? item.toJSON() : null;
   }

   async create(data: CreateGastoDTO): Promise<GastoProps> {
      if (data.monto_total <= 0) throw new Error("El monto debe ser mayor a 0");

      this.#normalizarItem(data);
      if (data.monto_total <= 0) throw new Error("El monto debe ser mayor a 0");

      this.validateCobrable(data);

      if (data.deduccion) {
         this.validateDeduccion(data.deduccion);
         const disponible = this.montoDisponibleParaDeduccion(data);
         if (data.deduccion.monto_total > disponible) {
            throw new Error(
               `La deducción no puede superar el monto disponible del gasto ($${disponible.toLocaleString("en-US", { minimumFractionDigits: 2 })}), tras descontar lo cobrado al cliente.`
            );
         }
          const item = await this.repo.createWithDeduccion(data);
          await this.#recalcularProyectos([item.proyecto_id]);
          return item.toJSON();
       }

       const item = await this.repo.create(data);
       await this.#recalcularProyectos([item.proyecto_id]);
       return item.toJSON();
    }

   async update(id: string, data: UpdateGastoDTO): Promise<GastoProps | null> {
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto debe ser mayor a 0");
      }

      this.#normalizarItem(data as CreateGastoDTO);
      if (data.monto_total !== undefined && data.monto_total <= 0) {
         throw new Error("El monto debe ser mayor a 0");
      }

      if (data.cobrable_monto !== undefined && data.cobrable_monto !== null && data.cobrable_monto < 0) {
         throw new Error("El monto a cobrar al cliente no puede ser menor a 0");
      }
      if (data.cobrable_proyecto && data.cobrable_monto != null && data.monto_total !== undefined) {
         if (data.cobrable_monto > data.monto_total) {
            throw new Error("El monto a cobrar al cliente no puede ser mayor al monto del gasto");
         }
      }

      const anterior = await this.repo.findById(id);

      const item = await this.repo.update(id, data);
      if (item) {
         // El proyecto pudo cambiar de valor; recalcula ambos si aplica.
         await this.#recalcularProyectos([anterior?.proyecto_id, item.proyecto_id]);
      }
      return item ? item.toJSON() : null;
   }

   private validateCobrable(data: CreateGastoDTO): void {
      if (!data.cobrable_proyecto) return;

      const cobrable = data.cobrable_monto ?? 0;
      if (cobrable < 0) {
         throw new Error("El monto a cobrar al cliente no puede ser menor a 0");
      }
      if (cobrable > data.monto_total) {
         throw new Error("El monto a cobrar al cliente no puede ser mayor al monto del gasto");
      }
   }

   /**
    * Mueve un gasto entre cobrable e incobrable del proyecto. Las reglas:
    * - Hacia cobrable: si no se provee monto, se conserva el cobrable_monto ya
    *   guardado (si es válido) o se usa el monto total del gasto.
    * - Hacia no cobrable: el monto cobrable se conserva en BD, solo se apaga la
    *   bandera (ya no se toma en cuenta para el cobro al cliente).
    */
   async moveCobrable(id: string, data: MoveCobrableDTO): Promise<GastoProps | null> {
      const item = await this.repo.findById(id);
      if (!item) throw new Error("Gasto no encontrado");

      if (!data.cobrable_proyecto) {
         const updated = await this.repo.update(id, { cobrable_proyecto: false });
         if (!updated) return null;
         await this.#recalcularProyectos([updated.proyecto_id]);
         return updated.toJSON();
      }

      let monto: number;
      if (data.cobrable_monto != null) {
         // 0 = cobrar el total del gasto.
         monto = data.cobrable_monto === 0 ? item.monto_total : data.cobrable_monto;
      } else {
         const existente = item.cobrable_monto ?? 0;
         monto = existente > 0 && existente <= item.monto_total ? existente : item.monto_total;
      }

      if (monto < 0) {
         throw new Error("El monto a cobrar al cliente no puede ser menor a 0");
      }
      if (monto > item.monto_total) {
         throw new Error("El monto a cobrar al cliente no puede ser mayor al monto del gasto");
      }

      const updated = await this.repo.update(id, { cobrable_proyecto: true, cobrable_monto: monto });
      if (!updated) return null;
      await this.#recalcularProyectos([updated.proyecto_id]);
      return updated.toJSON();
   }

   private montoDisponibleParaDeduccion(data: CreateGastoDTO): number {
      const cobrable = data.cobrable_proyecto ? (data.cobrable_monto ?? 0) : 0;
      return Math.max(0, data.monto_total - cobrable);
   }

   private validateDeduccion(deduccion: CreateGastoDeduccionDTO): void {
      if (deduccion.monto_total <= 0) {
         throw new Error("El monto de la deducción debe ser mayor a 0");
      }
      if (deduccion.cuotas_sugeridas !== undefined && deduccion.cuotas_sugeridas <= 0) {
         throw new Error("La cantidad de cuotas sugeridas debe ser mayor a 0");
      }
   }

   async delete(id: string, data: DeleteGastoDTO): Promise<boolean> {
      if (!data.deleted_reason?.trim()) {
         throw new Error("Debe proporcionar un motivo de eliminación");
      }
      const item = await this.repo.findById(id);
      const deleted = await this.repo.delete(id, data);
      await this.#recalcularProyectos([item?.proyecto_id]);
      return deleted;
   }

   async restore(id: string): Promise<GastoProps | null>{
      if (!id) {
         throw new Error("Debe proporcionar el id para restaurar el gasto");
      }
      const item = await this.repo.restore(id);
      if (item) await this.#recalcularProyectos([item.proyecto_id]);
      return item ? item.toJSON() : null;
   }
}