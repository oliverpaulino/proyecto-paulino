import {
   EmployeeProps,
   CreateEmployeeDTO,
   IEmployeeRepository,
   UpdateEmployeeDTO,
} from "../domain/employees.domain";

export class EmployeeService {
   constructor(private readonly repo: IEmployeeRepository) {}

   async getAll(): Promise<EmployeeProps[]> {
      const employees = await this.repo.findAll();
      return employees.map((e) => e.toJSON());
   }

   async getById(id: string): Promise<EmployeeProps | null> {
      const employee = await this.repo.findById(id);
      return employee ? employee.toJSON() : null;
   }

   async create(data: CreateEmployeeDTO): Promise<EmployeeProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.identificacion?.trim()) throw new Error("Identificación es requerida");
      if (!data.tipo_identificacion) throw new Error("Tipo de identificación es requerido");
      if (!data.rol) throw new Error("Rol es requerido");
      if (data.salario < 0) throw new Error("El salario no puede ser negativo");

      const duplicado = await this.repo.existsByIdentificacion(data.identificacion);
      if (duplicado) {
         throw new Error("Ya existe un empleado con esa identificación");
      }

      const employee = await this.repo.create(data);
      return employee.toJSON();
   }

   async update(id: string, data: UpdateEmployeeDTO): Promise<EmployeeProps | null> {
      if (data.salario !== undefined && data.salario < 0) {
         throw new Error("El salario no puede ser negativo");
      }

      if (data.identificacion) {
         const duplicado = await this.repo.existsByIdentificacion(data.identificacion, id);
         if (duplicado) {
            throw new Error("Ya existe un empleado con esa identificación");
         }
      }

      const employee = await this.repo.update(id, data);
      return employee ? employee.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}
