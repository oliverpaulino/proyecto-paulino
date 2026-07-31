// ─── Archivos adjuntos a un proyecto ─────────────────────────────────────────
// El módulo guarda la metadata en `proyecto_archivo` y el binario en Supabase
// Storage (bucket privado `proyectos-archivos`). El binario NO se expone en el
// listado: la descarga se pide bajo demanda a
// `GET /api/proyectos/archivos/:id/descargar`, que devuelve una signed URL de
// 60 segundos de expiración.

export interface ProyectoArchivoProps {
   id: string;
   proyecto_id: string;
   /** Nombre editable por el usuario; se usa al descargar. */
   nombre_archivo: string;
   /** Ruta del objeto dentro del bucket, devuelta por Supabase al subir. */
   storage_path: string;
   tipo_mime: string;
   tamanio_bytes: number;
   created_at: Date;
}

export interface CreateProyectoArchivoDTO {
   proyecto_id: string;
   nombre_archivo: string;
   storage_path: string;
   tipo_mime: string;
   tamanio_bytes: number;
}

export interface IProyectoArchivoRepository {
   findByProyectoId(proyectoId: string): Promise<ProyectoArchivoProps[]>;
   findById(id: string): Promise<ProyectoArchivoProps | null>;
   create(data: CreateProyectoArchivoDTO): Promise<ProyectoArchivoProps>;
   /** Guarda todos en una sola transacción (rollback si falla cualquiera). */
   createMany(data: CreateProyectoArchivoDTO[]): Promise<ProyectoArchivoProps[]>;
   /** Renombra el archivo. Devuelve la fila actualizada o null si no existe. */
   update(id: string, nombreArchivo: string): Promise<ProyectoArchivoProps | null>;
   delete(id: string): Promise<boolean>;
}

export interface IProyectoArchivoStorage {
   /** Sube el binario y devuelve el storage_path que devuelve Supabase. */
   upload(path: string, file: File): Promise<string>;
   remove(path: string): Promise<void>;
    /**
     * Signed URL de expiración configurable (default 60 segundos).
     * `options.download` añade `Content-Disposition: attachment` con ese nombre
     * para forzar la descarga (y no el preview inline).
     */
    createSignedUrl(
       path: string,
       expiresIn?: number,
       options?: { download?: string | boolean },
    ): Promise<string>;
}
