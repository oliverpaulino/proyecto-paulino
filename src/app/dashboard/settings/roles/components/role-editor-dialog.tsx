"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  GROUP_ORDER,
  PERMISSION_CATALOG,
  type ResourceGroup,
} from "@/lib/permission-catalog";

export type PermissionMap = Record<string, string[]>;

export interface RoleRow {
  key: string;
  label: string;
  description: string | null;
  permissions: PermissionMap;
  isBuiltin: boolean;
  isAdmin: boolean;
}

interface RoleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing role to edit, or `null` to create a new one. */
  role: RoleRow | null;
  onSaved: () => void;
}

/** Catalog entries bucketed by display group, in `GROUP_ORDER`. */
const CATALOG_BY_GROUP = GROUP_ORDER.map((group) => ({
  group,
  entries: PERMISSION_CATALOG.filter((e) => e.group === group),
})).filter((g) => g.entries.length > 0);

export function RoleEditorDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: RoleEditorDialogProps) {
  const isEdit = role !== null;

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the dialog opens for a different role.
  useEffect(() => {
    if (!open) return;
    setKey(role?.key ?? "");
    setLabel(role?.label ?? "");
    setDescription(role?.description ?? "");
    setPermissions(structuredClone(role?.permissions ?? {}));
    setError(null);
  }, [open, role]);

  const toggle = (resource: string, action: string, checked: boolean) => {
    setPermissions((prev) => {
      const current = new Set(prev[resource] ?? []);
      if (checked) current.add(action);
      else current.delete(action);

      const next = { ...prev };
      if (current.size === 0) delete next[resource];
      else next[resource] = [...current];
      return next;
    });
  };

  /** Select or clear every action of one resource at once. */
  const toggleResource = (
    resource: string,
    actions: string[],
    checked: boolean,
  ) => {
    setPermissions((prev) => {
      const next = { ...prev };
      if (checked) next[resource] = [...actions];
      else delete next[resource];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        isEdit ? `/api/roles/${role.key}` : "/api/roles",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(
            isEdit
              ? { label, description, permissions }
              : { key, label, description, permissions },
          ),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo guardar el rol");
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const totalGranted = Object.values(permissions).reduce(
    (s, a) => s + a.length,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEdit ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          <DialogDescription>
            Selecciona los permisos que otorga este rol. Los cambios se aplican
            a los usuarios en menos de un minuto.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role-label">Nombre</Label>
              <Input
                id="role-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Jefe de taller"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-key">Clave</Label>
              <Input
                id="role-key"
                value={key}
                disabled={isEdit}
                onChange={(e) =>
                  setKey(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "_")
                      .slice(0, 32),
                  )
                }
                placeholder="jefe_taller"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "La clave no puede cambiarse."
                  : "Identificador interno, no se puede cambiar después."}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Descripción</Label>
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gestiona el taller y su inventario"
            />
          </div>

          <Separator />

          {CATALOG_BY_GROUP.map(({ group, entries }) => (
            <PermissionGroup
              key={group}
              group={group}
              entries={entries}
              permissions={permissions}
              onToggle={toggle}
              onToggleResource={toggleResource}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t px-6 py-4">
          <span className="text-sm text-muted-foreground">
            {totalGranted} permiso{totalGranted === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            {error && <span className="text-sm text-destructive">{error}</span>}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !label.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionGroupProps {
  group: ResourceGroup;
  entries: (typeof PERMISSION_CATALOG)[number][];
  permissions: PermissionMap;
  onToggle: (resource: string, action: string, checked: boolean) => void;
  onToggleResource: (
    resource: string,
    actions: string[],
    checked: boolean,
  ) => void;
}

function PermissionGroup({
  group,
  entries,
  permissions,
  onToggle,
  onToggleResource,
}: PermissionGroupProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group}
      </p>

      <div className="space-y-3">
        {entries.map((entry) => {
          const granted = permissions[entry.resource] ?? [];
          const allActions = entry.actions.map((a) => a.action);
          const allChecked = granted.length === allActions.length;

          return (
            <div
              key={entry.resource}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`res-${entry.resource}`}
                  checked={allChecked}
                  onCheckedChange={(c) =>
                    onToggleResource(entry.resource, allActions, c === true)
                  }
                />
                <Label
                  htmlFor={`res-${entry.resource}`}
                  className="font-medium cursor-pointer"
                >
                  {entry.label}
                </Label>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 pl-6">
                {entry.actions.map(({ action, label: actionText }) => (
                  <div key={action} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`${entry.resource}-${action}`}
                      checked={granted.includes(action)}
                      onCheckedChange={(c) =>
                        onToggle(entry.resource, action, c === true)
                      }
                    />
                    <Label
                      htmlFor={`${entry.resource}-${action}`}
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      {actionText}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
