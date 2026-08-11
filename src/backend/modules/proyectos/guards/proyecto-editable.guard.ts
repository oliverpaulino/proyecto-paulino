import db from "@/backend/database";
import { KyselyProyectoRepository } from "../infraestructure/proyecto.infraestructure";

const repo = new KyselyProyectoRepository(db);

/**
 * Guard compartido de escritura sobre proyectos. Rechaza cualquier mutación
 * (conduces, cargos, archivos, tarifas de proyecto) cuando el proyecto está
 * COMPLETADO: un proyecto cerrado es inmutable salvo el cambio de estado.
 *
 * CANCELADO y BORRADOR NO bloquean — un proyecto cancelado sigue siendo
 * editable (el usuario lo pidió explícitamente).
 *
 * Se llama al inicio de cada write, justo después de validar la sesión.
 */
export async function assertProyectoEditable(proyectoId: string): Promise<void> {
   const estado = await repo.getEstado(proyectoId);
   if (estado === "COMPLETADO") {
      throw new Error(
         "El proyecto está COMPLETADO y no puede editarse. Cámbialo a otro estado para continuar."
      );
   }
}
