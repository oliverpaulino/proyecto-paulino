import { create } from "zustand";
import { toast } from "sonner";

export interface ProyectoArchivo {
   id: string;
   nombre_archivo: string;
   tipo_mime: string;
   tamanio_bytes: number;
   created_at: string;
}

type ArchivoStore = {
   archivos: ProyectoArchivo[];
   loading: boolean;
   error: string | null;

   GetArchivos: (proyectoId: string) => Promise<void>;
   UploadArchivos: (proyectoId: string, files: File[]) => Promise<void>;
   RenombrarArchivo: (proyectoId: string, archivoId: string, nombreArchivo: string) => Promise<void>;
   DeleteArchivo: (proyectoId: string, archivoId: string) => Promise<void>;
   GetArchivoUrl: (archivoId: string, download?: boolean) => Promise<string | null>;

   clearError: () => void;
};

export const useArchivoStore = create<ArchivoStore>((set, get) => ({
   archivos: [],
   loading: false,
   error: null,

   GetArchivos: async (proyectoId) => {
      set({ loading: true, error: null });
      try {
         const res = await fetch(`/api/proyectos/${proyectoId}/archivos`);
         if (!res.ok) throw new Error("Error al cargar los archivos");
         const data = await res.json();
         set({ archivos: data.archivos ?? [] });
      } catch (err) {
         const message = err instanceof Error ? err.message : "Error al cargar los archivos";
         set({ error: message });
         toast.error(message);
      } finally {
         set({ loading: false });
      }
   },

   UploadArchivos: async (proyectoId, files) => {
      try {
         const formData = new FormData();
         for (const file of files) formData.append("files", file);

         const res = await fetch(`/api/proyectos/${proyectoId}/archivos`, {
            method: "POST",
            body: formData,
         });
         if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? "Error al subir los archivos");
         }
         await get().GetArchivos(proyectoId);
         toast.success(
            files.length === 1 ? "Archivo subido correctamente" : `${files.length} archivos subidos`,
         );
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Error al subir los archivos");
      }
   },

   RenombrarArchivo: async (proyectoId, archivoId, nombreArchivo) => {
      try {
         const res = await fetch(`/api/proyectos/${proyectoId}/archivos/${archivoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre_archivo: nombreArchivo }),
         });
         if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? "Error al renombrar el archivo");
         }
         toast.success("Archivo renombrado");
         await get().GetArchivos(proyectoId);
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Error al renombrar el archivo");
      }
   },

   DeleteArchivo: async (proyectoId, archivoId) => {
      try {
         const res = await fetch(`/api/proyectos/${proyectoId}/archivos/${archivoId}`, {
            method: "DELETE",
         });
         if (!res.ok) throw new Error("Error al eliminar el archivo");
         toast.success("Archivo eliminado");
         await get().GetArchivos(proyectoId);
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Error al eliminar el archivo");
      }
   },

   GetArchivoUrl: async (archivoId, download = false) => {
      try {
         const res = await fetch(
            `/api/proyectos/archivos/${archivoId}/descargar${download ? "?descargar=true" : ""}`,
         );
         if (!res.ok) throw new Error();
         const data = await res.json();
         return data.url ?? null;
      } catch {
         toast.error("No se pudo generar el enlace del archivo");
         return null;
      }
   },

   clearError: () => set({ error: null }),
}));
