export interface IPaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface IBaseRepository<T> {
    findById(id: string | number): Promise<T | null>;
    findAll(filter?: any): Promise<T[] | IPaginatedResult<T>>;
    create(item: T): Promise<T>;
    update(id: string | number, item: Partial<T>): Promise<boolean>;
    delete(id: string | number): Promise<boolean>;
}
