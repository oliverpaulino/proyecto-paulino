import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { NavHotkeysProvider } from "@/components/nav-hotkeys-provider";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <NavHotkeysProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0 overflow-hidden">
            <DashboardHeader />
            <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {children}
            </main>
        </SidebarInset>
      </SidebarProvider>
    </NavHotkeysProvider>
  );
}