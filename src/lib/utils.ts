import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function catchError<T>(
  promise: Promise<T>
): Promise<[undefined, T] | [Error]> {
  return promise
    .then((data) => {
      return [undefined, data] as [undefined, T];
    })
    .catch((error) => {
      return [error];
    });
}

export const fechaRD = (value: string) => {

  if (value === "day") {
    return new Date().toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
      day: "2-digit",
    });
  } else if (value === "month") {
    return new Date().toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
      month: "2-digit",
    });
  } else if (value === "year") {
    return new Date().toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
    });
  } else
    return new Date().toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
    })
};
