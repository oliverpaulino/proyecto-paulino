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
         <div className="flex flex-1 flex-col mt-8 gap-4 p-4 pt-0">
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