import crypto from "crypto";
import {
   EmployeeProps,
   CreateEmployeeDTO,
   IEmployeeRepository,
   UpdateEmployeeDTO,
   ContactEmpleadoProps,
   OperadorProps,
   SaveTarifasBulkPayload
} from "../domain/employees.domain";
``
export class EmployeeService {
   constructor(private readonly repo: IEmployeeRepository) { }

   async getAll(params?: { page?: number; limit?: number; search?: string }): Promise<EmployeeProps[]> {
      const employees = await this.repo.findAll(params);
      return employees.map((e) => e.toJSON());
   }

   async getAllOperators(params?: { page?: number; limit?: number; search?: string }): Promise<OperadorProps[]> {
      const operators = await this.repo.findAllOperators(params);
      return operators.map(o => o.toJSON());
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

      return this.repo.createOperator({
         id: crypto.randomUUID(),
         empleado_id: data.empleado_id,
         licencia: data.licencia ?? null,
         fecha_vencimiento: data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null,
         created_at: new Date(),
         updated_at: new Date()
      });
   }

   async updateOperator(id: string, data: { licencia?: string | null; fecha_vencimiento?: string | null }): Promise<OperadorProps> {
      const updateData: Partial<OperadorProps> = {
         updated_at: new Date()
      };
      if (data.licencia !== undefined) updateData.licencia = data.licencia ?? null;
      if (data.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null;

      return this.repo.updateOperator(id, updateData);
   }

   async addTarifa(data: { empleado_id: string; categoria_equipo_tarifa_id: string; monto_pago: number }) {
      try {
         return await this.repo.createTarifa(data);
      } catch (error: any) {

         throw new Error("Error al asignar la tarifa al empleado.");
      }
   }

   async updateTarifa(tarifaId: string, monto_pago: number, frecuencia_pago: string) {
      try {
         return await this.repo.updateTarifa(tarifaId, monto_pago, frecuencia_pago);
      } catch (error) {
         throw new Error("Error al actualizar la tarifa.");
      }
   }

   async deleteTarifa(tarifaId: string) {
      try {
         if (!tarifaId) {
            throw new Error("El ID de la tarifa es requerido.");
         }

         // Devuelve la fila eliminada: la ruta necesita empleado_id para saber
         // qué proyectos recalcular (cambiaron los totales de nómina/rentabilidad).
         return await this.repo.deleteTarifa(tarifaId);
      } catch (error: any) {
         console.error("Error en deleteTarifa:", error);
         throw new Error("Error al eliminar la tarifa de operación.");
      }
   }

   async saveTarifasEnBloque(payload: SaveTarifasBulkPayload) {
      try {
         const { empleado_id, tarifas } = payload;

         // 1. Lógica de negocio: Filtrar tarifas inválidas (ej. montos negativos o nulos)
         const tarifasValidas = tarifas.filter(t =>
            t.monto_pago >= 0 &&
            t.categoria_equipo_tarifa_id !== ""
         );

         // 2. Si no hay tarifas válidas, no hacemos peticiones innecesarias a la BD
         if (tarifasValidas.length === 0) {
            return { success: true, message: "No se enviaron tarifas válidas para guardar." };
         }

         // 3. Enviar a infraestructura para el Upsert (ON CONFLICT DO UPDATE)
         await this.repo.upsertTarifasCategoria(empleado_id, tarifasValidas);

         return { success: true, message: "Tarifas guardadas correctamente." };

      } catch (error: any) {
         console.error("Error en saveTarifasEnBloque:", error);
         throw new Error("Error al procesar y guardar las tarifas del empleado.");
      }
   }

   async getEmployeeDetails(empleadoId: string) {
      try {
         const details = await this.repo.getEmployeeDetails(empleadoId);
         if (!details.empleado) {
            throw new Error("Empleado no encontrado");
         }
         return details;
      } catch (error) {
         throw new Error("Error al obtener los detalles del empleado");
      }
   }
}