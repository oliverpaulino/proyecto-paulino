import { CategoriaEquipo } from "@/dtos/categoria-equipo.dto";
import {
   CreateEquipoDTO,
   ESTADOS_EQUIPO,
   EquipoCompraItemProps,
   EquipoProps,
   EstadoEquipo,
   EstadoHistorialProps,
   IEquipoRepository,
   UpdateEquipoDTO,
} from "../domain/equipo.domain";
import { EmployeeService } from "../../employees/service/employees.service";
import { EmployeeProps, IEmployeeRepository, OperadorProps } from "../../employees/domain/employees.domain";
import { OperadorAsignable } from "@/dtos/employee.dto";

const ESTADOS = new Set<string>(ESTADOS_EQUIPO);
const MIN_ANO = 1950;
const MAX_ANO = new Date().getFullYear() + 1;


export class EquipoService {

   constructor(
      private readonly repo: IEquipoRepository,
      private readonly employeeRepo: IEmployeeRepository
   ) { }



   async getAll(params?: { page?: number; limit?: number; search?: string }): Promise<EquipoProps[]> {
      const { page = 1, limit = 10, search = "" } = params || {};
      const equipos = await this.repo.findAll({ page, limit, search });
      return equipos.map((e) => e.toJSON());
   }

   async getById(id: string): Promise<EquipoProps | null> {
      const equipo = await this.repo.findById(id);
      return equipo ? equipo.toJSON() : null;
   }

   async create(data: CreateEquipoDTO): Promise<EquipoProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.categoria_id) throw new Error("Categoría es requerida");
      if (data.estado !== undefined && !ESTADOS.has(data.estado)) {
         throw new Error("Estado de equipo inválido");
      }
      this.validateAno(data.ano);
      await this.validarOperadorActivo(data.operador_id);

      const equipo = await this.repo.create({
         ...data,
         ano: data.ano != null ? Number(data.ano) : null,
      });
      return equipo.toJSON();
   }

   async update(id: string, data: UpdateEquipoDTO): Promise<EquipoProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }
      if (data.estado !== undefined && !ESTADOS.has(data.estado)) {
         throw new Error("Estado de equipo inválido");
      }
      this.validateAno(data.ano);
      // Solo se valida cuando el operador cambia: un equipo que se creó con un
      // operador activo y luego ese empleado quedó inactivo, se puede seguir
      // editando (otros campos) sin reasignar. Asignarlo ahora a un inactivo, no.
      if (data.operador_id !== undefined) {
         const existing = await this.repo.findById(id);
         if (existing && existing.operador_id !== data.operador_id) {
            await this.validarOperadorActivo(data.operador_id);
         }
      }

      const payload: UpdateEquipoDTO = { ...data };
      if (data.ano !== undefined && data.ano !== null) payload.ano = Number(data.ano);

      const equipo = await this.repo.update(id, payload);
      return equipo ? equipo.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   async getCategoriaByEquipoId(id: string): Promise<CategoriaEquipo | null> {
      return this.repo.findCategoriaByEquipoId(id);
   }

   // Refactorización profesional
   async getOperadorByEquipoId(id: string): Promise<OperadorProps | null> {
      try {
         const equipo = await this.repo.findById(id);
         if (!equipo) {
            console.error(`Equipo con id ${id} no encontrado`);
            return null;
         }
         const operador = await this.employeeRepo.findOperatorById(equipo?.operador_id ?? "");
         if (!operador) {
            console.error(`Operador con id ${equipo?.operador_id} no encontrado para el equipo ${id}`);
         }
         return operador;
      } catch (error) {
         console.error(`Error al obtener operador ${id}:`, error);
         return null;
      }
   }
   async changeEstado(
      id: string,
      nuevoEstado: string,
      userId?: string | null,
      userName?: string | null,
      nota?: string | null
   ): Promise<EquipoProps | null> {
      if (!ESTADOS.has(nuevoEstado)) {
         throw new Error("Estado de equipo inválido");
      }
      const equipo = await this.repo.changeEstado(
         id,
         nuevoEstado as EstadoEquipo,
         userId ?? null,
         userName ?? null,
         nota ?? null
      );
      return equipo ? equipo.toJSON() : null;
   }

   async getHistorial(id: string): Promise<EstadoHistorialProps[]> {
      return this.repo.findHistorial(id);
   }

   async getComprasItems(
      id: string,
      filtros?: { desde?: string; hasta?: string }
   ): Promise<EquipoCompraItemProps[]> {
      return this.repo.findComprasItems(id, filtros);
   }

   private validateCosto(costo: number | undefined): void {
      if (costo !== undefined && (Number.isNaN(Number(costo)) || Number(costo) < 0)) {
         throw new Error("Costo por hora debe ser un número mayor o igual a 0");
      }
   }

   /**
    * Un empleado inactivo no puede quedar asignado a un equipo: se rechaza en
    * creación y, en edición, solo si el operador cambia. `operador_id` ausente
    * (sin cambio) se deja pasar.
    */
   private async validarOperadorActivo(operadorId?: string | null): Promise<void> {
      if (!operadorId) return;
      const activo = await this.employeeRepo.isOperadorActivo(operadorId);
      if (activo === null) throw new Error("El operador seleccionado no existe");
      if (activo === false) throw new Error("No se puede asignar un operador inactivo a un equipo");
   }

   private validateAno(ano: number | null | undefined): void {
      if (ano == null) return;
      const n = Number(ano);
      if (!Number.isInteger(n) || n < MIN_ANO || n > MAX_ANO) {
         throw new Error(`Año debe estar entre ${MIN_ANO} y ${MAX_ANO}`);
      }
   }
}
