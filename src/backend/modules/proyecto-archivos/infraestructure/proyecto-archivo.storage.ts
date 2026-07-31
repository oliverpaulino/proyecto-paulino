import {
   getSupabaseClient,
   PROYECTOS_ARCHIVOS_BUCKET,
} from "@/backend/storage/supabase";
import type { IProyectoArchivoStorage } from "../domain/proyecto-archivo.domain";

export class SupabaseProyectoArchivoStorage implements IProyectoArchivoStorage {
   async upload(path: string, file: File): Promise<string> {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage
         .from(PROYECTOS_ARCHIVOS_BUCKET)
         .upload(path, file, {
            contentType: file.type,
            upsert: false,
            cacheControl: "3600",
         });
      if (error) throw error;
      return data.path;
   }

   async remove(path: string): Promise<void> {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(PROYECTOS_ARCHIVOS_BUCKET).remove([path]);
      if (error) throw error;
   }

   async createSignedUrl(
      path: string,
      expiresIn = 60,
      options?: { download?: string | boolean },
   ): Promise<string> {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage
         .from(PROYECTOS_ARCHIVOS_BUCKET)
         .createSignedUrl(path, expiresIn, options);
      if (error) throw error;
      return data.signedUrl;
   }
}
