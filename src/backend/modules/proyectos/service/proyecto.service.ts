import type {
   IProyectoRepository,
   CreateProyectoExpressDTO,
   ProyectoProps,
   TipoProyecto,
   LiquidacionExpressFacade,
} from "../domain/proyecto.domain";

export class ProyectoService {
   constructor(private readonly repo: IProyectoRepository) {}

   async getAll(tipo?: TipoProyecto): Promise<ProyectoProps[]> {
      return this.repo.findAll(tipo);
   }

   async getById(id: string): Promise<ProyectoProps | null> {
      return this.repo.findById(id);
   }

   async createExpress(data: CreateProyectoExpressDTO): Promise<ProyectoProps> {
      if (!data.cliente_id?.trim())  throw new Error("El cliente es requerido");
      if (!data.empleado_id?.trim()) throw new Error("El operador es requerido para el cálculo de nómina");
      if (!data.equipo_id?.trim())   throw new Error("El equipo es requerido para el cálculo de rentabilidad");
      if (data.tarifa_servicio < 0)  throw new Error("La tarifa del servicio debe ser mayor o igual a 0");
      if (data.horas_trabajadas < 0) throw new Error("Las horas trabajadas deben ser mayor o igual a 0");

      this.#validateItems(data.cargos_cobrables, "cargo cobrable");
      this.#validateItems(data.gastos_internos, "gasto interno");

      return this.repo.createExpress(data);
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
