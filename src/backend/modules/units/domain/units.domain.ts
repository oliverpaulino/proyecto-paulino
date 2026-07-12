export type TipoUnidad = "LONGITUD" | "AREA" | "VOLUMEN" | "TIEMPO" | "FRECUENCIA" | "MASA" | "OTRO";

export interface UnitProps {
    id: string;
    nombre: string;
    abreviatura: string;
    tipo_unidad: TipoUnidad;
    factor_a_base: number;
    created_at: Date;
    updated_at: Date;   
}

export interface ConversionResult {
    valorOrigen: number;
    unidadOrigen: string;
    valorDestino: number;
    unidadDestino: string;
    factor: number;
}

export class Unit {
    private constructor(private readonly props: UnitProps) {}
    
    static create(props: UnitProps): Unit {
         return new Unit(props);
    }

    get id() { return this.props.id; }
    get nombre() { return this.props.nombre; }
    get abreviatura() { return this.props.abreviatura; }
    get tipo_unidad() { return this.props.tipo_unidad; }
    get factor_a_base() { return this.props.factor_a_base; }
    get created_at() { return this.props.created_at; }
    get updated_at() { return this.props.updated_at; }

    toJSON(): UnitProps {
        return { ...this.props };
    }
}

export interface CreateUnitDTO {
    nombre: string;
    abreviatura: string;
    tipo_unidad: TipoUnidad;
    factor_a_base: number;
}

export type UpdateUnitDTO = Partial<CreateUnitDTO>;

export interface IUnitRepository {
    findAll(): Promise<Unit[]>;
    findById(id: string): Promise<Unit | null>;
    findAllByTipoUnidad(tipoUnidad: TipoUnidad): Promise<Unit[]>;
    create(data: CreateUnitDTO): Promise<Unit>;
    update(id: string, data: UpdateUnitDTO): Promise<Unit | null>;
    delete(id: string): Promise<boolean>;
}