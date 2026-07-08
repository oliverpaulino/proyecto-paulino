import {
   UserEmployeeLinkProps,
   CreateUserEmployeeLinkDTO,
   UpdateUserEmployeeLinkDTO,
   IUserEmployeeLinkRepository
} from "../domain/user-employee-link.domain";

export class UserEmployeeLinkService {
   constructor(private readonly repo: IUserEmployeeLinkRepository) {}

   async getAll(): Promise<UserEmployeeLinkProps[]> {
      const links = await this.repo.findAll();
      return links.map((link) => link.toJSON());
   }

   async getById(id: string): Promise<UserEmployeeLinkProps | null> {
      const link = await this.repo.findById(id);
      return link ? link.toJSON() : null;
   }

   async getByUserId(userId: string): Promise<UserEmployeeLinkProps[]> {
      const links = await this.repo.findAllByUserId(userId);
      return links.map((link) => link.toJSON());
   }

   async getByEmployeeId(empleadoId: string): Promise<UserEmployeeLinkProps | null> {
      const link = await this.repo.findByEmployeeId(empleadoId);
      return link ? link.toJSON() : null;
   }

   async create(data: CreateUserEmployeeLinkDTO): Promise<UserEmployeeLinkProps> {
      if (!data.user_id?.trim()) throw new Error("user_id es requerido");
      if (!data.empleado_id?.trim()) throw new Error("empleado_id es requerido");

      const exists = await this.repo.findByEmployeeId(data.empleado_id);
      if (exists) {
         throw new Error("Este empleado ya está vinculado a un usuario");
      }

      const link = await this.repo.create(data);
      return link.toJSON();
   }

   async update(id: string, data: UpdateUserEmployeeLinkDTO): Promise<UserEmployeeLinkProps | null> {
      const link = await this.repo.update(id, data);
      return link ? link.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }
}