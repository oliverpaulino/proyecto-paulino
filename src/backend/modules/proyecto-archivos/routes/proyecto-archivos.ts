import { Hono } from "hono";
import db from "@/backend/database";
import { auth } from "@/lib/auth";
import { KyselyProyectoArchivoRepository } from "../infraestructure/proyecto-archivo.infraestructure";
import { SupabaseProyectoArchivoStorage } from "../infraestructure/proyecto-archivo.storage";
import { ProyectoArchivoService } from "../service/proyecto-archivo.service";
import { assertProyectoEditable } from "../../proyectos/guards/proyecto-editable.guard";

const repo = new KyselyProyectoArchivoRepository(db);
const storage = new SupabaseProyectoArchivoStorage();
const service = new ProyectoArchivoService(repo, storage);

const proyectoArchivosRoute = new Hono();

function getSession(c: { req: { raw: Request } }) {
   return auth.api.getSession({ headers: c.req.raw.headers });
}

// GET /api/proyectos/:proyectoId/archivos — listado de metadata (sin binario)
proyectoArchivosRoute.get("/:proyectoId/archivos", async (c) => {
   try {
      const session = await getSession(c);
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const archivos = await service.list(c.req.param("proyectoId"));
      return c.json({ archivos });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al listar archivos" }, 500);
   }
});

// POST /api/proyectos/:proyectoId/archivos — multipart/form-data
// Sube el(los) binario(s) a Supabase Storage y registra la metadata con el
// storage_path devuelto por Supabase, en una transacción.
proyectoArchivosRoute.post("/:proyectoId/archivos", async (c) => {
   try {
      const session = await getSession(c);
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      await assertProyectoEditable(c.req.param("proyectoId"));

      const body = await c.req.parseBody({ all: true });
      const raw = body["files"];

      let files: File[] = [];
      if (Array.isArray(raw)) {
         files = raw.filter((v): v is File => v instanceof File);
      } else if (raw instanceof File) {
         files = [raw];
      }

      const creados = await service.uploadFiles(c.req.param("proyectoId"), files);
      return c.json({ archivos: creados }, 201);
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al subir archivo" }, 400);
   }
});

// GET /api/proyectos/archivos/:id/descargar
// Consulta el storage_path en Kysely y devuelve una signed URL de 60 segundos
// de expiración. Con ?descargar=true la URL fuerza Content-Disposition
// attachment usando el nombre editable del archivo, de modo que el navegador
// lo descarga con ese nombre. Sin el parámetro se previsualiza inline.
proyectoArchivosRoute.get("/archivos/:id/descargar", async (c) => {
   try {
      const session = await getSession(c);
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      const url = await service.createSignedUrl(
         c.req.param("id"),
         c.req.query("descargar") === "true",
      );
      if (!url) return c.json({ error: "Archivo no encontrado" }, 404);

      return c.json({ url });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al generar la descarga" }, 500);
   }
});

// PATCH /api/proyectos/:proyectoId/archivos/:archivoId
// Renombra el archivo (solo metadata). Body: { nombre_archivo: string }
proyectoArchivosRoute.patch("/:proyectoId/archivos/:archivoId", async (c) => {
   try {
      const session = await getSession(c);
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      await assertProyectoEditable(c.req.param("proyectoId"));

      const { nombre_archivo } = await c.req.json();
      const meta = await service.rename(c.req.param("archivoId"), String(nombre_archivo ?? ""));
      if (!meta || meta.proyecto_id !== c.req.param("proyectoId"))
         return c.json({ error: "Archivo no encontrado" }, 404);

      return c.json({ archivo: meta });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al renombrar el archivo" }, 400);
   }
});

// DELETE /api/proyectos/:proyectoId/archivos/:archivoId
proyectoArchivosRoute.delete("/:proyectoId/archivos/:archivoId", async (c) => {
   try {
      const session = await getSession(c);
      if (!session?.user) return c.json({ error: "No autenticado" }, 401);

      await assertProyectoEditable(c.req.param("proyectoId"));

      const meta = await service.getById(c.req.param("archivoId"));
      if (!meta || meta.proyecto_id !== c.req.param("proyectoId"))
         return c.json({ error: "Archivo no encontrado" }, 404);

      await service.remove(meta.id);
      return c.json({ success: true });
   } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Error al eliminar archivo" }, 500);
   }
});

export default proyectoArchivosRoute;
