import { z } from "zod";





// SCHEMAS GENERALES
export const TipoIdentificacion = {
  CEDULA: "Cédula",
  RNC: "RNC",
  PASAPORTE: "Pasaporte",
} as const;

export const TipoContacto = {
  TELEFONO: "Teléfono",
  EMAIL: "Correo electrónico",
} as const;

const TelefonoSchema = z
  .string()
  .regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos");

const EmailSchema = z.email("El correo electrónico no es válido");

const OptionalEmailSchema = z.union([EmailSchema, z.literal("")]).nullable().optional();
const OptionalTelefonoSchema = z.union([TelefonoSchema, z.literal("")]).nullable().optional();

// RNC: Acepta 9 o 11 dígitos numéricos
const RncSchema = z
  .string()
  .regex(/^(\d{9}|\d{11})$/, "El RNC debe tener 9 u 11 dígitos numéricos");

// Cédula: 11 dígitos numéricos
const CedulaSchema = z
  .string()
  .regex(/^\d{11}$/, "La cédula debe tener exactamente 11 dígitos numéricos");

// Pasaporte: alfanumérico de 1 a 20 caracteres
const PasaporteSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{1,20}$/, "El pasaporte debe contener entre 1 y 20 caracteres alfanuméricos");

const TipoIdentificacionSchema = z.enum(
  Object.keys(TipoIdentificacion) as [
    keyof typeof TipoIdentificacion,
    ...(keyof typeof TipoIdentificacion)[]
  ]
);

const TipoContactoSchema = z.enum(
  Object.keys(TipoContacto) as [
    keyof typeof TipoContacto,
    ...(keyof typeof TipoContacto)[]
  ]
);

export const GeneralSchemasDTO = {
  TelefonoSchema,
  EmailSchema,
  OptionalEmailSchema,
  OptionalTelefonoSchema,
  RncSchema,
  CedulaSchema,
  PasaporteSchema,
  TipoIdentificacionSchema,
  TipoContactoSchema,
};