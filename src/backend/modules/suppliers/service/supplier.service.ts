import { CreateSupplierDTO, ISupplierRepository, SupplierProps, TipoProveedor, UpdateSupplierDTO } from "../domain/supplier.domain";

const TIPOS_VALIDOS: TipoProveedor[] = ["SUPLIDOR", "SUB_CONTRATISTA"];

export class SupplierService {
   constructor(private readonly repo: ISupplierRepository) { }

   async getAll(): Promise<SupplierProps[]> {
      const suppliers = await this.repo.findAll();
      return suppliers.map((s) => s.toJSON());
   }

   async getById(id: string): Promise<SupplierProps | null> {
      const supplier = await this.repo.findById(id);
      return supplier ? supplier.toJSON() : null;
   }

   async create(data: CreateSupplierDTO): Promise<SupplierProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.rnc?.trim()) throw new Error("RNC es requerido");
      if (!data.tipo || !TIPOS_VALIDOS.includes(data.tipo)) {
         throw new Error("Tipo de proveedor inválido");
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
         throw new Error("Email inválido");
      }

      const supplier = await this.repo.create(data);
      return supplier.toJSON();
   }

   async update(id: string, data: UpdateSupplierDTO): Promise<SupplierProps | null> {
      if (data.tipo !== undefined && !TIPOS_VALIDOS.includes(data.tipo!)) {
         throw new Error("Tipo de proveedor inválido");
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
         throw new Error("Email inválido");
      }

      const supplier = await this.repo.update(id, data);
      return supplier ? supplier.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
