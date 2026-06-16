// backend/providers/dgii.provider.ts

export const dgiiProvider = {
   async consultarRNC(rnc: string) {
      const apiUrl = `${process.env.NEXT_PUBLIC_DGII_API_URL}/api/consulta?rnc=${rnc}`;

      try {
         const response = await fetch(apiUrl);
         const data = await response.json();

         return { data, status: response.status };
      } catch (error) {
         console.error(`[DGII Provider] Error catastrófico consultando el RNC ${rnc}:`, error);
         throw error;
      }
   }
};