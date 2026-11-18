import { z } from 'zod';

const strongPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña excede el límite permitido')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
    password: z.string().min(1, 'Contraseña requerida').max(128),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    nombre: z.string().trim().min(3, 'Nombre demasiado corto').max(120),
    email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
    password: strongPasswordSchema,
    rol: z.enum(['APRENDIZ', 'INSTRUCTOR']).default('APRENDIZ'),
  }),
});

export const recoverAccountSchema = z.object({
  body: z.object({
    nombre: z.string().trim().min(3, 'Ingresa al menos 3 caracteres del nombre').max(120),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
    otp: z.string().trim().regex(/^\d{6}$/, 'El código OTP debe tener 6 dígitos'),
    newPassword: strongPasswordSchema,
  }),
});

