import { z } from 'zod';

export const crearSesionRequestSchema = z.object({
  body: z.object({
    nombreClase: z
      .string({ required_error: 'El nombre de la clase es obligatorio' })
      .trim()
      .min(3, 'El nombre de la clase debe tener al menos 3 caracteres')
      .max(120, 'El nombre de la clase no puede superar 120 caracteres'),
    ttlSegundos: z.coerce
      .number()
      .int()
      .min(10, 'El TTL mínimo es de 10 segundos')
      .max(7200, 'El TTL máximo es de 7200 segundos (2 horas)')
      .default(60),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const rotarQRRequestSchema = z.object({
  params: z.object({
    sesionId: z.string().uuid('sesionId debe ser un UUID válido'),
  }),
  body: z
    .object({
      ttlSegundos: z.coerce.number().int().min(10).max(7200).default(60),
    })
    .default({}),
  query: z.object({}).optional(),
});

export const listarSesionesRequestSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
  params: z.object({}).optional(),
  body: z.object({}).optional(),
});

export type CrearSesionBody = z.infer<typeof crearSesionRequestSchema>['body'];
export type RotarQRBody = z.infer<typeof rotarQRRequestSchema>['body'];
export type ListarSesionesQuery = z.infer<typeof listarSesionesRequestSchema>['query'];

