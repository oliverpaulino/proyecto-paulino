import Link from "next/link";
import { ConducesEliminados } from "./components/conduces-eliminados";
import { ArrowLeft, FileStack, StepBack, Trash2 } from "lucide-react";

export default function Page() {
   return <div className="p-4">

      <div className="mb-4">
         <div className="flex items-center gap-3">
            <div className="">
               <Link
                  href="/dashboard/conduces"
                  className="group inline-flex items-center gap-2 rounded-md bg-zinc-200 p-2 text-sm font-medium text-zinc-900 hover:bg-brand-red hover:text-white transition-colors"
               >

                  <ArrowLeft className="size-4 text-brand-red transition-colors group-hover:text-white" />

               </Link>
            </div>
            <Trash2 className="size-7 text-brand-red dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-brand-red dark:text-white tracking-tight">
               Conduces Eliminados
            </h2>
         </div>
         <p className="mt-1.5 ml-11 text-sm text-muted-foreground">
            Registro de conduces de camión y equipo pesado — asignados o pendientes de asignar a un proyecto.
         </p>
         <div className="mt-4 h-px bg-gradient-to-r from-brand-red via-brand-yellow/50 to-transparent" />

      </div>


      <ConducesEliminados />
   </div>
}