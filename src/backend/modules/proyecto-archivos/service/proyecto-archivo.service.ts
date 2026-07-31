import { randomUUID } from "crypto";
import type {
   CreateProyectoArchivoDTO,
   IProyectoArchivoRepository,
   IProyectoArchivoStorage,
   ProyectoArchivoProps,
} from "../domain/proyecto-archivo.domain";

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
export const MAX_FILES_PER_REQUEST = 10;
export const SIGNED_URL_EXPIRATION = 60; // segundos

// Extensión derivada del mime type. Solo estos tipos se aceptan: nada de
// html/svg (XSS) ni ejecutables.
const ALLOWED_TYPES: Record<string, string> = {
   "application/pdf": "pdf",
   "image/png": "png",
   "image/jpeg": "jpg",
   "image/gif": "gif",
   "image/webp": "webp",
   "text/plain": "txt",
   "text/csv": "csv",
   "application/msword": "doc",
   "application/vnd.ms-excel": "xls",
   "application/vnd.ms-powerpoint": "ppt",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
   "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
   "application/zip": "zip",
   "application/x-zip-compressed": "zip",
};

export class ProyectoArchivoService {
   constructor(
      private readonly repo: IProyectoArchivoRepository,
      private readonly storage: IProyectoArchivoStorage,
   ) {}

   async list(proyectoId: string): Promise<ProyectoArchivoProps[]> {
      return this.repo.findByProyectoId(proyectoId);
   }

   async getById(id: string): Promise<ProyectoArchivoProps | null> {
      return this.repo.findById(id);
   }

   /**
    * Sube el binario a Supabase Storage (bucket privado) y registra la
    * metadata de forma transaccional. Si el INSERT falla, borra del bucket el
    * objeto recién subido para no dejar huérfanos.
    */
   async uploadFiles(proyectoId: string, files: File[]): Promise<ProyectoArchivoProps[]> {
      if (files.length === 0) throw new Error("No se recibió ningún archivo");
      if (files.length > MAX_FILES_PER_REQUEST)
         throw new Error(`Máximo ${MAX_FILES_PER_REQUEST} archivos por carga`);

      // Validar TODO antes de subir nada.
      const validados = files.map((file) => {
         if (file.size === 0) throw new Error(`"${file.name}" está vacío`);
         if (file.size > MAX_FILE_SIZE)
            throw new Error(`"${file.name}" supera el límite de 15 MB`);
         const ext = ALLOWED_TYPES[file.type];
         if (!ext)
            throw new Error(
               `"${file.name}" no es un tipo de archivo permitido (${file.type || "desconocido"})`,
            );
         return { file, path: `${proyectoId}/${randomUUID()}.${ext}`, storagePath: "" };
      });

      // 1. Subir todos los binarios al bucket.
      for (const item of validados) {
         // El storage_path lo devuelve Supabase; se guarda tal cual.
         item.storagePath = await this.storage.upload(item.path, item.file);
      }

      // 2. Guardar la metadata en UNA transacción.
      const registros: CreateProyectoArchivoDTO[] = validados.map((item) => ({
         proyecto_id: proyectoId,
         nombre_archivo: item.file.name,
         storage_path: item.storagePath,
         tipo_mime: item.file.type,
         tamanio_bytes: item.file.size,
      }));

      try {
         return await this.repo.createMany(registros);
      } catch (err) {
         // Rollback del storage: limpiar los objetos subidos en el paso 1.
         await Promise.all(
            validados.map((item) => this.storage.remove(item.storagePath).catch(() => undefined)),
         );
         throw err;
      }
   }

   /**
    * Signed URL para un archivo. El binario nunca se expone en el listado; se
    * solicita bajo demanda y caduca a los 60 segundos. Con `download` en true,
    * la URL fuerza `Content-Disposition: attachment` con el nombre editable del
    * archivo, para que el navegador descargue con ese nombre.
    */
   async createSignedUrl(id: string, download?: boolean): Promise<string | null> {
      const meta = await this.repo.findById(id);
      if (!meta) return null;
      return this.storage.createSignedUrl(
         meta.storage_path,
         SIGNED_URL_EXPIRATION,
         download ? { download: meta.nombre_archivo } : undefined,
      );
   }

   /**
    * Renombra el archivo. Solo toca la metadata (nombre_archivo); el binario y
    * el storage_path no cambian. Devuelve null si el archivo no existe.
    *
    * La extensión original del archivo (la del storage_path) siempre se
    * conserva: si el usuario escribe el nombre sin extensión, se le vuelve a
    * adjuntar. Así la descarga nunca queda con un nombre sin extensión.
    */
   async rename(id: string, nombreArchivo: string): Promise<ProyectoArchivoProps | null> {
      const meta = await this.repo.findById(id);
      if (!meta) return null;

      const ext = this.#extensionOf(meta.storage_path);
      const nombre = this.#sanitizeNombre(nombreArchivo);
      const conExtension =
         ext && !nombre.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
            ? `${nombre}.${ext}`
            : nombre;

      return this.repo.update(id, conExtension);
   }

   #sanitizeNombre(nombreArchivo: string): string {
      const nombre = nombreArchivo.trim().replace(/[/\\\0]/g, "-");
      if (!nombre) throw new Error("El nombre no puede estar vacío");
      if (nombre.length > 200)
         throw new Error("El nombre no puede superar los 200 caracteres");
      return nombre;
   }

   /** Extensión (sin el punto) del storage_path, p. ej. "pdf". */
   #extensionOf(storagePath: string): string {
      const match = storagePath.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1] : "";
   }

   async remove(id: string): Promise<boolean> {
      const meta = await this.repo.findById(id);
      if (!meta) return false;

      await this.repo.delete(id);

      // Limpiar el objeto del bucket.
      await this.storage.remove(meta.storage_path).catch(() => undefined);
      return true;
   }
}
