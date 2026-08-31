"use client";

import { useEffect } from "react";
import type { Employee } from "@/dtos/employee.dto";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Contact, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/permission-guard";
import Link from "next/link";
import { useRolEmpleadoStore } from "@/stores/useRolEmpleadoStore";

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const BADGE_FALLBACK =
  "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-400";

const BADGE_BY_COLOR: Record<string, string> = {
  "#3b82f6": "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  "#a855f7": "bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  "#f97316": "bg-orange-100 text-orange-900 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  "#22c55e": "bg-green-100 text-green-900 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  "#eab308": "bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  "#ef4444": "bg-red-100 text-red-900 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  "#6b7280": "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  "#ec4899": "bg-pink-100 text-pink-900 border border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
};

export function EmployeeTable({
  employees,
  onEdit,
  onDelete,
}: EmployeeTableProps) {
  const router = useRouter();
  const { roles, GetRoles } = useRolEmpleadoStore();

  useEffect(() => {
    GetRoles();
  }, [GetRoles]);

  // Mapa nombre -> { label, color } para acceso rápido
  const rolMap = new Map(roles.map((r) => [r.nombre, { label: r.label, color: r.color }]));

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-blue/20 bg-brand-blue/5 p-12 text-sm text-muted-foreground gap-2">
        <span className="text-3xl opacity-30">👷</span>
        <span>No hay empleados que mostrar.</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-2 py-3 w-10"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
              Identificación
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
              Empleado
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
              Rol
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
              Salario
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-200">
              Estado
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-200">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const rolInfo = rolMap.get(employee.rol);
            const badgeColor = rolInfo?.color ?? null;
            const badgeClass = badgeColor
              ? (BADGE_BY_COLOR[badgeColor] ?? BADGE_FALLBACK)
              : BADGE_FALLBACK;

            return (
              <tr
                key={employee.id}
                className="border-t border-border hover:bg-brand-yellow/5 transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/empleados/${employee.id}`)}
              >
                <td className="px-2 py-3">
                  <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/empleados/${employee.id}`) }} className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors" title="Ver detalle">
                    <Eye className="size-4" />
                  </button>
                </td>
                <td className="px-4 py-3  transition-colors">
                  <div className="text-xs text-muted-foreground">
                    {employee.tipo_identificacion}
                  </div>
                  <span className="inline-block rounded bg-brand-yellow/25  px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-black dark:text-brand-yellow">
                    {employee.identificacion}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-brand-blue dark:text-white">
                    {employee.nombre}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(employee.created_at).toLocaleDateString("es-DO")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                  >
                    {rolInfo?.label ?? employee.rol}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">
                  RD$ {employee.salario.toLocaleString("es-DO")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      employee.activo
                        ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {employee.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <PermissionGuard resource="users" action="update">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(employee);
                        }}
                        className="rounded-md p-1.5 text-brand-blue hover:bg-brand-blue/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard resource="users" action="delete">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(employee);
                        }}
                        className="rounded-md p-1.5 text-brand-red hover:bg-brand-red/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </PermissionGuard>

                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-brand-blue/10"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/dashboard/empleados/${employee.id}`)
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver en Detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/empleados/${employee.id}/contacts`,
                            )
                          }
                        >
                          <Contact className="w-4 h-4 mr-2" />
                          Ver Contactos
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
