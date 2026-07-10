import crypto from "crypto";
import {
   EmployeeProps,
   CreateEmployeeDTO,
   IEmployeeRepository,
   UpdateEmployeeDTO,
   ContactEmpleadoProps,
   OperadorProps
} from "../domain/employees.domain";

export class EmployeeService {
   constructor(private readonly repo: IEmployeeRepository) {}

   async getAll(): Promise<EmployeeProps[]> {
      const employees = await this.repo.findAll();
      return employees.map((e) => e.toJSON());
   }

   async getUnlinked(): Promise<EmployeeProps[]> {
      const employees = await this.repo.findUnlinkedEmployees();
      return employees.map((e) => e.toJSON());
   }

   async getLinkedByUserId(userId: string): Promise<EmployeeProps[]> {
      const employees = await this.repo.findLinkedEmployeesByUserId(userId);
      return employees.map((e) => e.toJSON());
   }

   async getById(id: string): Promise<EmployeeProps | null> {
      const employee = await this.repo.findById(id);
      return employee ? employee.toJSON() : null;
   }

   async getDetails(id: string) {
      const empleado = await this.getById(id);
      if (!empleado) return null;

      const [contactos, operador] = await Promise.all([
         this.repo.getContactsByEmployeeId(id),
         this.repo.getOperatorByEmployeeId(id)
      ]);

      return { empleado, contactos, operador };
   }

   async getOperator(empleadoId: string): Promise<OperadorProps | null> {
      return this.repo.getOperatorByEmployeeId(empleadoId);
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

   async createContact(data: { empleado_id: string; name: string; email?: string | null; phone?: string | null; job_title?: string | null }): Promise<ContactEmpleadoProps> {
      const contactData: ContactEmpleadoProps = {
         id: crypto.randomUUID(),
         empleado_id: data.empleado_id,
         name: data.name,
         email: data.email ?? null,
         phone: data.phone ?? null,
         job_title: data.job_title ?? null,
         created_at: new Date(),
         updated_at: new Date(),
      };
      return this.repo.createContact(contactData);
   }

   async updateContact(id: string, data: any): Promise<ContactEmpleadoProps> {
      const updateData: Partial<ContactEmpleadoProps> = { updated_at: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email ?? null;
      if (data.phone !== undefined) updateData.phone = data.phone ?? null;
      if (data.job_title !== undefined) updateData.job_title = data.job_title ?? null;

      return this.repo.updateContact(id, updateData);
   }

   async deleteContact(id: string): Promise<boolean> {
      return this.repo.deleteContact(id);
   }

   async createOperator(data: { empleado_id: string; licencia?: string | null; fecha_vencimiento?: string | null }): Promise<OperadorProps> {
      const existing = await this.repo.getOperatorByEmployeeId(data.empleado_id);
      if (existing) throw new Error("Este empleado ya tiene un perfil de operador");

      const operatorData: OperadorProps = {
         id: crypto.randomUUID(),
         empleado_id: data.empleado_id,
         licencia: data.licencia ?? null,
         fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null,
         created_at: new Date(),
         updated_at: new Date(),
      };
      return this.repo.createOperator(operatorData);
   }

   async updateOperator(id: string, data: { licencia?: string | null; fecha_vencimiento?: string | null }): Promise<OperadorProps> {
      const updateData: Partial<OperadorProps> = {
         updated_at: new Date()
      };
      if (data.licencia !== undefined) updateData.licencia = data.licencia ?? null;
      if (data.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null;

      return this.repo.updateOperator(id, updateData);
   }
}