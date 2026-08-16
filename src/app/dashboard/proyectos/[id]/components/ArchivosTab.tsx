"use client";

import { useEffect, useRef, useState } from "react";
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionGuard } from "@/components/permission-guard";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
   Download,
   Eye,
   File,
   FileArchive,
   FileImage,
   FileSpreadsheet,
   FileText,
   Loader2,
   Lock,
   Pencil,
   Trash2,
   UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
   useArchivoStore,
   type ProyectoArchivo,
} from "@/stores/useArchivoStore";

const ACCEPT = [
   "application/pdf",
   "image/png",
   "image/jpeg",
   "image/gif",
   "image/webp",
   "text/plain",
   "text/csv",
   "application/msword",
   "application/vnd.ms-excel",
   "application/vnd.ms-powerpoint",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   "application/vnd.openxmlformats-officedocument.presentationml.presentation",
   "application/zip",
   "application/x-zip-compressed",
].join(",");

function isPreviewable(mime: string): boolean {
   return (
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime === "text/plain" ||
      mime === "text/csv"
   );
}

function formatBytes(bytes: number): string {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
   if (mime.startsWith("image/")) return <FileImage className="size-5 text-brand-blue" />;
   if (mime === "application/pdf") return <FileText className="size-5 text-red-500" />;
   if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv"))
      return <FileSpreadsheet className="size-5 text-green-600" />;
   if (mime.includes("presentation") || mime.includes("powerpoint"))
      return <File className="size-5 text-orange-500" />;
   if (mime === "application/zip" || mime === "application/x-zip-compressed")
      return <FileArchive className="size-5 text-yellow-600" />;
   return <File className="size-5 text-muted-foreground" />;
}

export function ArchivosTab({ proyectoId, locked = false }: { proyectoId: string; locked?: boolean }) {
   const { archivos, loading, GetArchivos, UploadArchivos, RenombrarArchivo, DeleteArchivo, GetArchivoUrl } = useArchivoStore();
   const [uploading, setUploading] = useState(false);
   const [dragging, setDragging] = useState(false);
   const [deleting, setDeleting] = useState<ProyectoArchivo | null>(null);
   const [deleteLoading, setDeleteLoading] = useState(false);
   const [renaming, setRenaming] = useState<ProyectoArchivo | null>(null);
   const [renameValue, setRenameValue] = useState("");
   const [renameLoading, setRenameLoading] = useState(false);
   const [preview, setPreview] = useState<{ archivo: ProyectoArchivo; url: string } | null>(null);
   const [previewLoading, setPreviewLoading] = useState(false);
   const inputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      GetArchivos(proyectoId);
   }, [proyectoId, GetArchivos]);

   async function handleFiles(files: FileList | File[]) {
      if (uploading) return;
      const list = Array.from(files);
      if (list.length === 0) return;

      setUploading(true);
      try {
         await UploadArchivos(proyectoId, list);
      } finally {
         setUploading(false);
         if (inputRef.current) inputRef.current.value = "";
      }
   }

   async function handleDescargar(archivo: ProyectoArchivo) {
      const url = await GetArchivoUrl(archivo.id, true);
      if (url) window.open(url, "_blank");
   }

   async function handlePreview(archivo: ProyectoArchivo) {
      setPreviewLoading(true);
      try {
         const url = await GetArchivoUrl(archivo.id);
         if (url) setPreview({ archivo, url });
      } finally {
         setPreviewLoading(false);
      }
   }

   async function handleRename() {
      if (!renaming) return;
      const nombre = renameValue.trim();
      if (!nombre) {
         toast.error("El nombre no puede estar vacío");
         return;
      }
      setRenameLoading(true);
      try {
         await RenombrarArchivo(proyectoId, renaming.id, nombre);
         setRenaming(null);
      } finally {
         setRenameLoading(false);
      }
   }

   async function handleDelete() {
      if (!deleting) return;
      setDeleteLoading(true);
      try {
         await DeleteArchivo(proyectoId, deleting.id);
         setDeleting(null);
      } finally {
         setDeleteLoading(false);
      }
   }

   return (
      <div className="space-y-4">
         <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
               <div>
                  <CardTitle>Archivos</CardTitle>
                  <CardDescription>
                     Cotizaciones, planos, documentos u otros adjuntos del proyecto. Se guardan en
                     almacenamiento privado y se accede mediante enlaces seguros de corta duración.
                  </CardDescription>
               </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <PermissionGuard resource="project" action="create">
                  {locked ? (
                     <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                        <Lock className="size-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                           Bloqueado: el proyecto está COMPLETADO. No se pueden subir archivos.
                        </p>
                     </div>
                  ) : (
                     <div
                        role="button"
                        tabIndex={0}
                        aria-label="Subir archivos"
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => {
                           if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                        }}
                        onDragOver={(e) => {
                           e.preventDefault();
                           setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                           e.preventDefault();
                           setDragging(false);
                           handleFiles(e.dataTransfer.files);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                           dragging
                              ? "border-brand-blue bg-brand-blue/10"
                              : "border-border bg-muted/30 hover:border-brand-blue/50 hover:bg-brand-blue/5"
                        }`}
                     >
                        <UploadCloud
                           className={`size-8 ${dragging ? "text-brand-blue" : "text-muted-foreground"}`}
                        />
                        <div className="text-sm font-medium">
                           {uploading ? "Subiendo archivos…" : "Arrastra archivos aquí o haz clic para seleccionar"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                           PDF, imágenes, Word, Excel, PowerPoint y ZIP. Hasta 15 MB por archivo.
                        </p>
                        <input
                           ref={inputRef}
                           type="file"
                           multiple
                           accept={ACCEPT}
                           className="hidden"
                           disabled={uploading}
                           onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        />
                     </div>
                  )}
               </PermissionGuard>

               {loading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                     <Loader2 className="size-5 animate-spin text-brand-blue" />
                  </div>
               ) : archivos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-8 text-sm text-muted-foreground">
                     <File className="size-8 opacity-40" />
                     <span>Aún no hay archivos en este proyecto.</span>
                  </div>
               ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                     {archivos.map((archivo) => {
                        const previewable = isPreviewable(archivo.tipo_mime);
                        return (
                           <li
                              key={archivo.id}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                           >
                              <FileIcon mime={archivo.tipo_mime} />
                              <div className="min-w-0 flex-1">
                                 <p className="truncate text-sm font-medium">{archivo.nombre_archivo}</p>
                                 <p className="text-xs text-muted-foreground">
                                    {formatBytes(archivo.tamanio_bytes)} ·{" "}
                                    {format(new Date(archivo.created_at), "dd MMM yyyy", { locale: es })}
                                 </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                 {previewable && (
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       disabled={previewLoading}
                                       onClick={() => handlePreview(archivo)}
                                       title="Vista previa"
                                    >
                                       <Eye className="size-4" />
                                    </Button>
                                 )}
                                 <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDescargar(archivo)}
                                    title="Descargar"
                                 >
                                    <Download className="size-4" />
                                 </Button>
                                 <PermissionGuard resource="project" action="update">
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       disabled={locked}
                                       onClick={() => {
                                          setRenaming(archivo);
                                          setRenameValue(archivo.nombre_archivo);
                                       }}
                                       title="Renombrar"
                                    >
                                       <Pencil className="size-4" />
                                    </Button>
                                 </PermissionGuard>
                                 <PermissionGuard resource="project" action="delete">
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       className="text-brand-red hover:text-brand-red"
                                       disabled={locked}
                                       onClick={() => setDeleting(archivo)}
                                       title="Eliminar"
                                    >
                                       <Trash2 className="size-4" />
                                    </Button>
                                 </PermissionGuard>
                              </div>
                           </li>
                        );
                     })}
                  </ul>
               )}
            </CardContent>
         </Card>

         <Dialog open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0 sm:max-w-4xl">
               <DialogHeader className="sr-only">
                  <DialogTitle>Vista previa</DialogTitle>
                  <DialogDescription>Previsualización del archivo</DialogDescription>
               </DialogHeader>
               {preview && (
                  <div className="flex h-full flex-col">
                     <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                           <FileIcon mime={preview.archivo.tipo_mime} />
                           <p className="truncate text-sm font-medium">{preview.archivo.nombre_archivo}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                           <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDescargar(preview.archivo)}
                           >
                              <Download className="mr-1 size-4" /> Descargar
                           </Button>
                           <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
                              Cerrar
                           </Button>
                        </div>
                     </div>
                     <div className="bg-muted/40 p-4">
                        {preview.archivo.tipo_mime.startsWith("image/") ? (
                           <img
                              src={preview.url}
                              alt={preview.archivo.nombre_archivo}
                              className="mx-auto max-h-[70vh] rounded-lg object-contain shadow"
                           />
                        ) : (
                           <iframe
                              src={preview.url}
                              title={preview.archivo.nombre_archivo}
                              className="h-[70vh] w-full rounded-lg bg-white shadow"
                           />
                        )}
                     </div>
                  </div>
               )}
            </DialogContent>
         </Dialog>

         <Dialog open={Boolean(renaming)} onOpenChange={(o) => !o && setRenaming(null)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>Renombrar archivo</DialogTitle>
                  <DialogDescription>
                     El archivo se descargará con este nombre. No afecta el contenido.
                  </DialogDescription>
               </DialogHeader>
               <form
                  className="space-y-4"
                  onSubmit={(e) => {
                     e.preventDefault();
                     handleRename();
                  }}
               >
                  <Input
                     value={renameValue}
                     onChange={(e) => setRenameValue(e.target.value)}
                     placeholder="Nuevo nombre"
                     autoFocus
                     disabled={renameLoading}
                     maxLength={200}
                  />
                  {renaming && (
                     <p className="text-xs text-muted-foreground">
                        Si borras la extensión (p. ej.{" "}
                        <span className="font-medium">
                           {renaming.nombre_archivo.split(".").pop()}
                        </span>
                        ) se volverá a agregar automáticamente para que la descarga no se dañe.
                     </p>
                  )}
                  <div className="flex justify-end gap-2">
                     <Button
                        type="button"
                        variant="outline"
                        disabled={renameLoading}
                        onClick={() => setRenaming(null)}
                     >
                        Cancelar
                     </Button>
                     <Button type="submit" disabled={renameLoading || !renameValue.trim()}>
                        {renameLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Guardar
                     </Button>
                  </div>
               </form>
            </DialogContent>
         </Dialog>

         <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Se eliminará <span className="font-medium">{deleting?.nombre_archivo}</span>{" "}
                     del proyecto y del almacenamiento. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                     className="bg-destructive text-white hover:bg-destructive/90"
                     onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                     }}
                     disabled={deleteLoading}
                  >
                     {deleteLoading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                     ) : (
                        <Trash2 className="mr-2 size-4" />
                     )}
                     Eliminar
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}
