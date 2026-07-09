import {
   UnitProps,
   CreateUnitDTO,
   UpdateUnitDTO,
   IUnitRepository,
   TipoUnidad,
   ConversionResult,
} from "../domain/units.domain";

export class UnitService {
   constructor(private readonly repo: IUnitRepository) {}

   async getAll(): Promise<UnitProps[]> {
      const units = await this.repo.findAll();
      return units.map((unit) => unit.toJSON());
   }

   async getById(id: string): Promise<UnitProps | null> {
      const unit = await this.repo.findById(id);
      return unit ? unit.toJSON() : null;
   }

   async getByTipoUnidad(tipoUnidad: TipoUnidad): Promise<UnitProps[]> {
      const units = await this.repo.findAllByTipoUnidad(tipoUnidad);
      return units.map((unit) => unit.toJSON());
   }

   async create(data: CreateUnitDTO): Promise<UnitProps> {
      if (!data.nombre?.trim()) throw new Error("El nombre de la unidad es requerido");
      if (!data.abreviatura?.trim()) throw new Error("La abreviatura es requerida");
      if (!data.tipo_unidad) throw new Error("El tipo de unidad es requerido");
      if (!data.factor_a_base || data.factor_a_base <= 0) throw new Error("El factor de conversión debe ser un número positivo");

      const unit = await this.repo.create(data);
      return unit.toJSON();
   }

   async update(id: string, data: UpdateUnitDTO): Promise<UnitProps | null> {
      const unit = await this.repo.update(id, data);
      return unit ? unit.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      const data = await this.repo.findById(id);
      
      if (!data) {
         throw new Error("Unidad no encontrada");
      }
      
      if (data.tipo_unidad !== "OTRO" && Number(data.factor_a_base) === 1) {
         throw new Error(
            `No puedes eliminar "${data.nombre}" (${data.abreviatura}). ` +
            `Es la unidad base del tipo ${data.tipo_unidad}.`
         );
      }
      
      return this.repo.delete(id);
   }

   async convertir(valor: number, unidadOrigenId: string, unidadDestinoId: string): Promise<ConversionResult> {
      if (!valor || valor < 0) {
         throw new Error("El valor a convertir debe ser un número positivo");
      }
      
      if (unidadOrigenId === unidadDestinoId) {
         throw new Error("Las unidades origen y destino son idénticas");
      }
      
      const unidadOrigen = await this.repo.findById(unidadOrigenId);
      const unidadDestino = await this.repo.findById(unidadDestinoId);
      
      if (!unidadOrigen) {
         throw new Error(`Unidad origen (${unidadOrigenId}) no encontrada`);
      }
      
      if (!unidadDestino) {
         throw new Error(`Unidad destino (${unidadDestinoId}) no encontrada`);
      }
      
      if (unidadOrigen.tipo_unidad !== unidadDestino.tipo_unidad) {
         throw new Error(
            `No se pueden convertir magnitudes diferentes: ` +
            `${unidadOrigen.tipo_unidad} (${unidadOrigen.abreviatura}) a ` +
            `${unidadDestino.tipo_unidad} (${unidadDestino.abreviatura})`
         );
      }
      
      const valorEnBase = valor * Number(unidadOrigen.factor_a_base);
      const valorFinal = valorEnBase / Number(unidadDestino.factor_a_base);
      
      return {
         valorOrigen: valor,
         unidadOrigen: unidadOrigen.abreviatura,
         valorDestino: valorFinal,
         unidadDestino: unidadDestino.abreviatura,
         factor: valorFinal / valor,
      };
   }
   
}