"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export type NavItem = {
  id: string;
  title: string;
  url?: string;
  icon?: LucideIcon;
  items?: NavItem[];
  disabled?: boolean;
  disabledMessage?: string;
  shortcut?: string[];
};

const STORAGE_KEY = "sidebar:open-folders";

export function NavMain({ items }: { items: NavItem[] }) {
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  const [mounted, setMounted] = React.useState(false);

  // Load from localStorage only after mount (client-side)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setOpenMap(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // Save to localStorage when openMap changes (only after mounted)
  React.useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    }
  }, [openMap, mounted]);

  const toggle = (id: string, open: boolean) => {
    setOpenMap((prev) => ({ ...prev, [id]: open }));
  };

  const renderSubItem = (item: NavItem) => {
    const isDisabled = item.disabled;

    const content = (
      <SidebarMenuSubButton
        asChild={!isDisabled}
        className={cn(
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        {isDisabled ? (
          <span>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </span>
        ) : (
          <a href={item.url!} className="group/item flex items-center justify-start relative w-full">
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.shortcut && (
              <KbdGroup className="group-hover/item:flex hidden right-2 absolute">
                {item.shortcut.map((key, idx) => (
                  <Kbd className="border" key={idx}>{key}</Kbd>
                ))}
              </KbdGroup>
            )}
          </a>
        )}
      </SidebarMenuSubButton>
    );

    if (isDisabled) {
      return (
        <SidebarMenuSubItem key={item.id}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="pointer-events-auto">{content}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.disabledMessage || "Módulo no disponible"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuSubItem>
      );
    }

    return <SidebarMenuSubItem key={item.id}>{content}</SidebarMenuSubItem>;
  };

  const renderCollapsibleSubItem = (item: NavItem) => {
    const isDisabled = item.disabled;

    const button = (
      <SidebarMenuSubButton
        asChild
        className={cn(
          "w-full cursor-pointer",
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        <button type="button">
          {item.icon && <item.icon />}
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </button>
       
      </SidebarMenuSubButton>
    );

    if (isDisabled) {
      return (
        <SidebarMenuSubItem key={item.id}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="pointer-events-auto cursor-not-allowed">
                  {button}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.disabledMessage || "Módulo no disponible"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuSubItem>
      );
    }

    return (
      <Collapsible
        key={item.id}
        open={!!openMap[item.id]}
        onOpenChange={(open) => toggle(item.id, open)}
        className="group/collapsible"
      >
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>{button}</CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items?.map((subItem) =>
                subItem.items?.length
                  ? renderCollapsibleSubItem(subItem)
                  : renderSubItem(subItem),
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    );
  };

  const renderCollapsibleItem = (item: NavItem) => {
    const isDisabled = item.disabled;

    const button = (
      <SidebarMenuButton
        tooltip={item.title}
        className={cn(
          "group/item",
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        )}
      >
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        {item.shortcut && (
          <KbdGroup className="group-hover/item:flex hidden ml-auto mr-1">
            {item.shortcut.map((key, idx) => (
              <Kbd className="border" key={idx}>{key}</Kbd>
            ))}
          </KbdGroup>
        )}
        <ChevronRight className={cn("transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90", item.shortcut ? "" : "ml-auto")} />
      </SidebarMenuButton>
    );

    if (isDisabled) {
      return (
        <SidebarMenuItem key={item.id}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="pointer-events-auto cursor-not-allowed">
                  {button}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.disabledMessage || "Módulo no disponible"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      );
    }

    return (
      <Collapsible
        key={item.id}
        open={!!openMap[item.id]}
        onOpenChange={(open) => toggle(item.id, open)}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>{button}</CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items?.map((subItem) =>
                subItem.items?.length
                  ? renderCollapsibleSubItem(subItem)
                  : renderSubItem(subItem),
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  const renderTopLevelItem = (item: NavItem) => {
    if (item.items?.length) {
      return renderCollapsibleItem(item);
    }

    const isDisabled = item.disabled;

    const button = (
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        className={cn(
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none ",
        )}
      >
        {isDisabled ? (
          <div>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </div>
        ) : (
          <a
            href={item.url!}
            className="group/item flex items-center justify-start relative w-full"
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>

            {item.shortcut && (
              <KbdGroup className=" group-hover/item:flex hidden right-2 absolute">
                {item.shortcut.map((key, idx) => (
                  <Kbd className="border" key={idx}>{key}</Kbd>
                ))}
              </KbdGroup>
            )}
          </a>
        )}
      </SidebarMenuButton>
    );

    if (isDisabled) {
      return (
        <SidebarMenuItem key={item.id}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="pointer-events-auto">{button}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.disabledMessage || "Módulo no disponible"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      );
    }

    return <SidebarMenuItem key={item.id}>{button}</SidebarMenuItem>;
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Módulos Principales</SidebarGroupLabel>
      <SidebarMenu>{items.map(renderTopLevelItem)}</SidebarMenu>
    </SidebarGroup>
  );
}