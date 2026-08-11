"use client";

import { HotkeysProvider } from "@tanstack/react-hotkeys";

/**
 * Envuelve `HotkeysProvider` en un client component: el layout del dashboard
 * es un Server Component async y no puede pasarle el objeto de opciones (ni
 * montar un context) directamente.
 *
 * El `timeout` es la ventana para completar la secuencia `G` + letra. 1s da
 * aire para pensar la segunda tecla sin dejar el prefijo colgando tanto que
 * una `G` suelta capture una pulsación no relacionada.
 */
export function NavHotkeysProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HotkeysProvider defaultOptions={{ hotkeySequence: { timeout: 1000 } }}>
      {children}
    </HotkeysProvider>
  );
}
