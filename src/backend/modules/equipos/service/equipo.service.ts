import {
   CreateEquipoDTO,
   ESTADOS_EQUIPO,
   EquipoProps,
   IEquipoRepository,
   TIPOS_EQUIPO,
   UpdateEquipoDTO,
} from "../domain/equipo.domain";

const TIPOS = new Set<string>(TIPOS_EQUIPO);
const ESTADOS = new Set<string>(ESTADOS_EQUIPO);
const MIN_ANO = 1950;
const MAX_ANO = new Date().getFullYear() + 1;

export class EquipoService {
   constructor(private readonly repo: IEquipoRepository) { }

   async getAll(): Promise<EquipoProps[]> {
      const equipos = await this.repo.findAll();
      return equipos.map((e) => e.toJSON());
   }

   async getById(id: string): Promise<EquipoProps | null> {
      const equipo = await this.repo.findById(id);
      return equipo ? equipo.toJSON() : null;
   }

   async create(data: CreateEquipoDTO): Promise<EquipoProps> {
      if (!data.nombre?.trim()) throw new Error("Nombre es requerido");
      if (!data.tipo || !TIPOS.has(data.tipo)) throw new Error("Tipo de equipo inválido");
      if (data.estado !== undefined && !ESTADOS.has(data.estado)) {
         throw new Error("Estado de equipo inválido");
      }
      this.validateCosto(data.costo_por_hora);
      this.validateAno(data.ano);

      const equipo = await this.repo.create({
         ...data,
         costo_por_hora: data.costo_por_hora !== undefined ? Number(data.costo_por_hora) : 0,
         ano: data.ano != null ? Number(data.ano) : null,
      });
      return equipo.toJSON();
   }

   async update(id: string, data: UpdateEquipoDTO): Promise<EquipoProps | null> {
      if (data.nombre !== undefined && !data.nombre.trim()) {
         throw new Error("Nombre es requerido");
      }
      if (data.tipo !== undefined && !TIPOS.has(data.tipo)) {
         throw new Error("Tipo de equipo inválido");
      }
      if (data.estado !== undefined && !ESTADOS.has(data.estado)) {
         throw new Error("Estado de equipo inválido");
      }
      this.validateCosto(data.costo_por_hora);
      this.validateAno(data.ano);

      const payload: UpdateEquipoDTO = { ...data };
      if (data.costo_por_hora !== undefined) payload.costo_por_hora = Number(data.costo_por_hora);
      if (data.ano !== undefined && data.ano !== null) payload.ano = Number(data.ano);

      const equipo = await this.repo.update(id, payload);
      return equipo ? equipo.toJSON() : null;
   }

   async delete(id: string): Promise<boolean> {
      return this.repo.delete(id);
   }

   private validateCosto(costo: number | undefined): void {
      if (costo !== undefined && (Number.isNaN(Number(costo)) || Number(costo) < 0)) {
         throw new Error("Costo por hora debe ser un número mayor o igual a 0");
      }
   }

   private validateAno(ano: number | null | undefined): void {
      if (ano == null) return;
      const n = Number(ano);
      if (!Number.isInteger(n) || n < MIN_ANO || n > MAX_ANO) {
         throw new Error(`Año debe estar entre ${MIN_ANO} y ${MAX_ANO}`);
      }
   }
}
