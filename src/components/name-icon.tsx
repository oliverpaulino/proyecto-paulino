import * as React from "react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Image from "next/image"

export function NameIcon() {
  const { state } = useSidebar()
  const isExpanded = state === "expanded"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex flex-col gap-2 h-auto py-1"
        >
          <div
            className={`flex items-center justify-center rounded-lg overflow-hidden shrink-0 transition-all ${isExpanded ? "w-50 h-30" : "w-8 h-8"
              }`}
          >
            <Image
              width={isExpanded ? 200 : 32}
              height={isExpanded ? 120 : 32}
              src="/logo-kissimmee.png"
              alt="Kissimmee"
              className="size-full object-contain"
            />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}