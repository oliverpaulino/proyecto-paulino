export interface UserEmployeeLinkProps {
      id: string;
      user_id: string;
      empleado_id: string;
      created_at: Date;
}

export class UserEmployeeLink {
    private constructor(private readonly props: UserEmployeeLinkProps) {}
    
    static create(props: UserEmployeeLinkProps): UserEmployeeLink {
         return new UserEmployeeLink(props);
    }

    get id() { return this.props.id; }
    get user_id() { return this.props.user_id; }
    get empleado_id() { return this.props.empleado_id; }
    get created_at() { return this.props.created_at; }

    toJSON(): UserEmployeeLinkProps {
        return { ...this.props };
    }
}

export interface CreateUserEmployeeLinkDTO {
    user_id: string;
    empleado_id: string;
}

export type UpdateUserEmployeeLinkDTO = Partial<CreateUserEmployeeLinkDTO>;

export interface IUserEmployeeLinkRepository {
    findAll(): Promise<UserEmployeeLink[]>;
    findById(id: string): Promise<UserEmployeeLink | null>;
    findAllByUserId(userId: string): Promise<UserEmployeeLink[]>;
    findByEmployeeId(id: string): Promise<UserEmployeeLink | null>;
    create(data: CreateUserEmployeeLinkDTO): Promise<UserEmployeeLink>;
    update(id: string, data: UpdateUserEmployeeLinkDTO): Promise<UserEmployeeLink | null>;
    delete(id: string): Promise<boolean>;
}