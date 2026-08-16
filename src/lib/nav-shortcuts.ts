/**
 * Atajos de teclado para navegar el sidebar.
 *
 * Todos son secuencias estilo Vim con prefijo `G` ("go to"): se pulsa `G` y
 * luego la letra del módulo. Se usan secuencias en vez de acordes `Mod+tecla`
 * porque son ~20 destinos y casi todos los `Mod+letra` ya están tomados por el
 * navegador (Mod+T, Mod+N, Mod+P, Mod+S...). El prefijo `G` no choca con nada.
 *
 * La clave es el `id` del item de nav en `app-sidebar.tsx`. Esta tabla es la
 * única fuente: alimenta tanto el registro real del atajo como las teclas que
 * se pintan en el sidebar, para que no se desincronicen.
 *
 * `@tanstack/hotkeys` ignora por defecto los eventos originados en inputs,
 * textareas y contenteditable (`ignoreInputs`), así que escribir "gc" en un
 * campo de búsqueda no dispara la navegación.
 */
import type { HotkeySequence } from "@tanstack/react-hotkeys";

export const NAV_SHORTCUTS: Record<string, HotkeySequence> = {
  // Generales
  panel: ["G", "H"], // Home
  notificaciones: ["G", "N"],

  // Operaciones
  "op-proyectos": ["G", "P"],
  "op-conduces": ["G", "C"],
  "op-equipos": ["G", "E"],
  "op-mantenimientos": ["G", "M"],

  // Control de Presupuesto
  "fin-cotizaciones": ["G", "Q"], // Q de "quote": C ya es Conduces
  "fin-compras": ["G", "B"], // B de "buy": C ya es Conduces
  "fin-cuentas-por-pagar": ["G", "X"],
  "fin-gastos": ["G", "G"],
  "fin-costos": ["G", "K"],
  "fin-deducciones": ["G", "D"],
  "fin-pagos": ["G", "Y"],

  // Personal
  "rh-empleados": ["G", "W"], // W de "workers": E ya es Equipos
  "rh-nomina": ["G", "O"], // O de "payrOll": N ya es Notificaciones

  // Directorio
  "dir-clientes": ["G", "L"], // cLientes: C ya es Conduces
  "dir-proveedores": ["G", "V"], // proVeedores: P ya es Proyectos

  // Configuración
  "settings-general": ["G", "S"],
  "settings-usuarios": ["G", "U"],
};
