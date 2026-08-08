import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase estándar para uso en el servidor.
 * Utiliza la llave anónima (Anon Key) y respeta las políticas RLS configuradas en tu panel.
 */
export const PROYECTOS_ARCHIVOS_BUCKET = "proyectos-archivos";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
   if (!client) {
      // Usamos las variables públicas/anónimas en lugar del Service Role
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (!url || !key) {
         throw new Error(
            "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno",
         );
      }

      client = createClient(url, key, {
         auth: { persistSession: false, autoRefreshToken: false },
      });
   }
   return client;
}