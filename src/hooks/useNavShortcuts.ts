"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useHotkeySequences, type HotkeySequence } from "@tanstack/react-hotkeys";

import type { NavItem } from "@/components/nav-main";
import { NAV_SHORTCUTS } from "@/lib/nav-shortcuts";

/**
 * Aplana el árbol de nav y se queda con los items navegables que tienen atajo.
 *
 * Recorre el árbol que ya construyó `AppSidebar`, no la tabla de atajos, así
 * que un módulo oculto por rol o permiso tampoco es alcanzable por teclado:
 * si el item no está en el árbol, no se registra su atajo. Los items sin url
 * real (`#`, solo carpetas) y los deshabilitados se descartan.
 */
function collectTargets(
  items: NavItem[],
): Array<{ sequence: HotkeySequence; url: string }> {
  const targets: Array<{ sequence: HotkeySequence; url: string }> = [];

  const walk = (list: NavItem[]) => {
    for (const item of list) {
      const sequence = NAV_SHORTCUTS[item.id];
      if (sequence && item.url && item.url !== "#" && !item.disabled) {
        targets.push({ sequence, url: item.url });
      }
      if (item.items?.length) walk(item.items);
    }
  };

  walk(items);
  return targets;
}

/**
 * Registra los atajos de navegación del sidebar.
 *
 * Se llama desde `AppSidebar` porque es quien arma el árbol de nav con los
 * filtros de rol y permiso ya aplicados.
 */
export function useNavShortcuts(items: NavItem[]) {
  const router = useRouter();

  const definitions = React.useMemo(
    () =>
      collectTargets(items).map(({ sequence, url }) => ({
        sequence,
        callback: () => router.push(url),
      })),
    [items, router],
  );

  useHotkeySequences(definitions);
}
