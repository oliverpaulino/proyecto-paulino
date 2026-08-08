export function formatMoney(value: number): string {
   return new Intl.NumberFormat("es-DO", {
      style: "currency", currency: "DOP", minimumFractionDigits: 2,
   }).format(value);
}

export const ESTADO_BADGE: Record<string, string> = {
   COMPLETADO: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
   BORRADOR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
   CANCELADO: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
   "EN PROGRESO": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};
