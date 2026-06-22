import { z } from "zod";

const validarLuhn = (cedula: string): boolean => {
  let sum = 0;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];

  for (let i = 0; i < 10; i++) {
    let calc = parseInt(cedula[i]) * weights[i];
    if (calc > 9) {
      calc -= 9; // Reduce números de dos dígitos sumándolos internamente
    }
    sum += calc;
  }

  const mod = sum % 10;
  const checkDigit = mod === 0 ? 0 : 10 - mod;
  
  return checkDigit === parseInt(cedula[10]);
};

const validarRncModulo11 = (rnc: string): boolean => {
  let sum = 0;
  const weights = [7, 9, 8, 6, 5, 4, 3, 2];

  for (let i = 0; i < 8; i++) {
    sum += parseInt(rnc[i]) * weights[i];
  }

  const mod = sum % 11;
  let checkDigit = 11 - mod;
  
  if (mod === 0) checkDigit = 2;
  if (mod === 1) checkDigit = 1;

  return checkDigit === parseInt(rnc[8]);
};



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

// RNC: Admite 9 dígitos (Jurídica) o 11 dígitos (Física) y aplica el algoritmo correspondiente
const RncSchema = z
  .string()
  .regex(/^(\d{9}|\d{11})$/, "El RNC debe tener 9 u 11 dígitos numéricos")
  .refine((val) => {
    if (val.length === 11) return validarLuhn(val); // RNC Persona Física = Cédula
    if (val.length === 9) return validarRncModulo11(val); // RNC Empresa
    return false;
  }, { message: "El RNC ingresado no es válido" });

// Cédula: 11 dígitos obligatorios con algoritmo de Luhn
const CedulaSchema = z
  .string()
  .regex(/^\d{11}$/, "La cédula debe tener exactamente 11 dígitos numéricos")
  .refine(validarLuhn, { message: "La cédula ingresada no es válida" });

// Pasaporte: Estándar global alfanumérico (letras y números sin guiones/espacios) de 5 a 15 caracteres
const PasaporteSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{5,15}$/, "El pasaporte debe contener entre 5 y 15 caracteres alfanuméricos");

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