"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useSession } from "@/lib/auth-client";

export function DashboardHeader() {
   const { unreadCount, fetchUnreadCount } = useNotificationStore();
   const { data: session } = useSession();

   useEffect(() => {
      if (!session?.user) return;
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30_000);
      return () => clearInterval(interval);
   }, [session?.user, fetchUnreadCount]);

   return (
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-2 bg-background">
         <SidebarTrigger className="-ml-1" />
         <div className="flex items-center pr-2">
            <Button
               variant="ghost"
               size="icon"
               asChild
               className="relative h-8 w-8"
            >
               <Link href="/dashboard/notificaciones">
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                     <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none pointer-events-none">
                        {unreadCount > 9 ? "+9" : unreadCount}
                     </span>
                  )}
                  <span className="sr-only">Notificaciones</span>
               </Link>
            </Button>
         </div>
      </header>
   );
}
