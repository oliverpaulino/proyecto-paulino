/** Envelope de listas paginadas: `data` trae SOLO la página actual y `total`
 * es el conteo real con los filtros aplicados (fuente de verdad para que el
 * frontend pueda calcular totalPages/hasNext sin adivinar). */
export interface PaginatedResult<T> {
   data: T[];
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}
