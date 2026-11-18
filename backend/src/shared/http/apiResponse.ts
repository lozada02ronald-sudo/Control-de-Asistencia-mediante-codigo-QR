import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export function sendSuccess<T>(res: Response, data: T, message = 'Operación exitosa', statusCode = 200) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(res: Response, data: T, message = 'Recurso creado') {
  return sendSuccess(res, data, message, 201);
}

