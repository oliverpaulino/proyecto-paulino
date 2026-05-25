import { Suspense } from "react";
import {
   Breadcrumb,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbList,
   BreadcrumbPage,
   BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientContactsView } from "./components/clientContactsView";

interface ClientContactsPageProps {
   params: Promise<{
      id: string;
   }>;
}

export default async function ClientContactsPage({ params }: ClientContactsPageProps) {
   const { id } = await params;
   return (
      <>
         <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center justify-between w-full gap-2 px-4">
               <div className="flex items-center">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                     orientation="vertical"
                     className="mr-2 data-[orientation=vertical]:h-4 "
                  />
                  <Breadcrumb>
                     <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                           <BreadcrumbLink href="/dashboard">
                              Dashboard
                           </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem className="hidden md:block">
                           <BreadcrumbLink href="/dashboard/clients">
                              Clientes
                           </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbPage className="text-muted-foreground">
                           Contacts
                        </BreadcrumbPage>
                     </BreadcrumbList>
                  </Breadcrumb>
               </div>
            </div>
         </header>
         <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Suspense fallback={<ContactsSkeleton />}>
               <ClientContactsView clientId={id} />
            </Suspense>
         </div>
      </>
   );
}

function ContactsSkeleton() {
   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div className="space-y-2">
               <Skeleton className="h-8 w-64" />
               <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
         </div>
         <div className="rounded-lg border p-6 space-y-4">
            <div className="space-y-2">
               {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
               ))}
            </div>
         </div>
      </div>
   );
}