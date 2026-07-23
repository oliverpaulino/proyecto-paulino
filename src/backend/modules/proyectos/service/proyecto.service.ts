import { IConduceRepository } from "../../conduce/domain/conduce.domain";
import type {
   IProyectoRepository,
   CreateProyectoExpressDTO,
   ProyectoProps,
   TipoProyecto,
   LiquidacionExpressFacade,
   ProyectoTotales,
} from "../domain/proyecto.domain";

export class ProyectoService {
   constructor(
      private readonly repo: IProyectoRepository,
      private readonly conduceRepo: IConduceRepository
   ) { }

   async getAll(tipo?: TipoProyecto): Promise<ProyectoProps[]> {
      // El historial no necesita el detalle de conduces por fila, solo los
      // totales ya cacheados (total_cobrable/total_gasto_interno/total_equipos).
      return this.repo.findAll(tipo);
   }

   async getById(id: string): Promise<ProyectoProps | null> {
      const proyecto = await this.repo.findById(id);
      if (!proyecto) return null;

      const conduces = await this.conduceRepo.findByProyectoId(id);
      return { ...proyecto, conduces };
   }

   async getByClientId(clienteId: string): Promise<ProyectoProps[]> {
      const proyectos = await this.repo.findByClientId(clienteId);
      if (!proyectos || proyectos.length === 0) return [];
      return Promise.all(
         proyectos.map(async (proyecto) => {
            const conduces = await this.conduceRepo.findByProyectoId(proyecto.id);
            return { ...proyecto, conduces };
         })
      );
   }

   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      if (!data.cliente_id?.trim()) throw new Error("El cliente es requerido");

      this.#validateItems(data.cargos_cobrables || [], "cargo cobrable");
      this.#validateItems(data.gastos_internos || [], "gasto interno");

      const proyecto = await this.repo.createExpress(data);
      return { ...proyecto, conduces: [] }; // recién creado, aún no tiene conduces
   }

   async getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null> {
      const liquidacion = await this.repo.getLiquidacion(id);
      if (!liquidacion) return null;

      // repo.getLiquidacion() arma el facade a partir de findById(), que a
      // propósito devuelve conduces: [] (ver nota en proyecto.infraestructure.ts).
      // Se combinan aquí igual que en getById(), en un solo lugar.
      const conduces = await this.conduceRepo.findByProyectoId(id);
      return { ...liquidacion, conduces };
   }

   async recalcularTotales(id: string): Promise<ProyectoTotales> {
      return this.repo.recalcularTotales(id);
   }

   #validateItems(
      items: Array<{ descripcion: string; cantidad: number; precio_unitario: number }>,
      tipo: string
   ): void {
      for (let i = 0; i < items.length; i++) {
         const item = items[i];
         if (!item.descripcion?.trim())
            throw new Error(`${tipo} ${i + 1}: la descripción es requerida`);
         if (item.cantidad <= 0)
            throw new Error(`${tipo} ${i + 1}: la cantidad debe ser mayor a 0`);
         if (item.precio_unitario < 0)
            throw new Error(`${tipo} ${i + 1}: el precio unitario debe ser mayor o igual a 0`);
      }
   }
}