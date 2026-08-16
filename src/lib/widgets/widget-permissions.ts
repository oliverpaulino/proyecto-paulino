import type { Action, Resource } from "@/hooks/permissions.types";
import {
   WIDGET_IDS, WIDGET_REGISTRY, type WidgetId, type WidgetMeta,
} from "./widget-registry";

/** `{ resource: action[] }` tal como viene en la sesión. */
export type PermissionMap = Record<string, string[]>;

/*
   Copias del mapeo que usa `usePermissions`. Se duplican acá a propósito: el
   hook resuelve UN permiso por render y estas funciones filtran el catálogo
   entero (y también corren fuera de React, al armar un preset). Si el mapeo
   del hook cambia, hay que reflejarlo acá — por eso los dos son constantes
   declarativas y no lógica.
*/
const RESOURCE_MAP: Record<Resource, readonly string[]> = {
   project: ["project"],
   product: ["product"],
   sale: ["quotation", "invoice"],
   category: ["category"],
   service: ["service"],
   user: ["user"],
   supplier: ["supplier"],
   organization: ["organization"],
   bu: ["organization"],
   finances: ["invoice", "account_payable", "account_receivable", "payment", "expense", "quotation", "purchase_order"],
   invoice: ["invoice"],
   ac: ["ac", "account_payable", "account_receivable"],
   features: ["notification", "authentication"],
   users: ["employee"],
   taxOrgProfiles: ["organization"],
   material_request: ["purchase_order", "goods_receipt", "inventory"],
   payment_request: ["payment", "account_payable"],
   client: ["client"],
   machinery: ["machinery"],
   task: ["task"],
   appointment: ["appointment"],
   payroll: ["payroll"],
   account_payable: ["account_payable"],
   account_receivable: ["account_receivable"],
   payment: ["payment"],
   expense: ["expense"],
   warning: ["warning"],
};

const ACTION_MAP: Record<Action, readonly string[]> = {
   create: ["create"],
   read: ["read", "view", "list", "consult"],
   update: ["update", "manage"],
   delete: ["delete", "manage"],
   share: ["manage"],
   discount: ["discount"],
   margin: ["manage"],
   approve: ["manage"],
   manage: ["manage"],
   view: ["view", "read"],
   add: ["create"],
   readAll: ["read", "list"],
   readOwn: ["read"],
};

/**
 * ¿El mapa de permisos alcanza para este widget?
 *
 * Las expansiones son ALTERNATIVAS, no conjunciones: basta con tener una de
 * las acciones físicas sobre uno de los recursos mapeados. Es el mismo
 * criterio de `usePermissions`, para que un widget nunca se muestre y luego
 * reciba 403 (ni al revés).
 */
export function puedeVerWidget(
   widget: Pick<WidgetMeta, "requiredPermissions">,
   permissions: PermissionMap | null,
): boolean {
   if (!widget.requiredPermissions) return true;
   if (!permissions) return false;

   const { resource, action } = widget.requiredPermissions;
   const acciones = Array.isArray(action) ? action : [action];
   const recursos = RESOURCE_MAP[resource] ?? [resource];

   return recursos.some((r) =>
      acciones.some((a) =>
         ACTION_MAP[a].some((fisica) => permissions[r]?.includes(fisica) ?? false),
      ),
   );
}

/** Ids que el usuario puede ver, en el orden del catálogo. */
export function widgetsVisibles(permissions: PermissionMap | null): WidgetId[] {
   return WIDGET_IDS.filter((id) => puedeVerWidget(WIDGET_REGISTRY[id], permissions));
}

/**
 * Catálogo completo anotado, para el modo edición: ahí sí conviene mostrar lo
 * bloqueado (en gris y con motivo) en vez de esconderlo, para que se entienda
 * que existe y por qué no está disponible.
 */
export function widgetsConPermiso(
   permissions: PermissionMap | null,
): Array<WidgetMeta & { puedeVer: boolean; motivo?: string }> {
   return WIDGET_IDS.map((id) => {
      const w = WIDGET_REGISTRY[id];
      const puedeVer = puedeVerWidget(w, permissions);
      return {
         ...w,
         puedeVer,
         motivo: puedeVer
            ? undefined
            : `Requiere permiso de ${w.requiredPermissions?.resource}`,
      };
   });
}
