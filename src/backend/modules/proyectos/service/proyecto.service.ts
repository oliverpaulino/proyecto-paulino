import type {
   IProyectoRepository,
   CreateProyectoExpressDTO,
   ProyectoProps,
   TipoProyecto,
   LiquidacionExpressFacade,
} from "../domain/proyecto.domain";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";

export class ProyectoService {
   constructor(private readonly repo: IProyectoRepository) { }

   async getAll(tipo?: TipoProyecto): Promise<ProyectoProps[]> {
      return this.repo.findAll(tipo);
   }

   async getById(id: string): Promise<ProyectoProps | null> {
      return this.repo.findById(id);
   }

   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      if (!data.cliente_id?.trim()) throw new Error("El cliente es requerido");
      // if (!data.servicio_id?.trim()) throw new Error("El servicio es requerido");
      if (!data.tarifas || data.tarifas.length === 0) throw new Error("Debe agregar al menos una tarifa");
      console.log("data desde service:", data);

      // Validar las tablas de gastos y cargos
      this.#validateItems(data.cargos_cobrables || [], "cargo cobrable");
      this.#validateItems(data.gastos_internos || [], "gasto interno");

      // Llamamos al repositorio principal
      return await this.repo.createExpress(data);
   }

   async getLiquidacion(id: string): Promise<LiquidacionExpressFacade | null> {
      return this.repo.getLiquidacion(id);
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
