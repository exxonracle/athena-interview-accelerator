import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'APP_ERROR') {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: 'The submitted data was incomplete or invalid.', code: 'VALIDATION_ERROR' }, { status: 400 });
  console.error('Athena server error', error instanceof Error ? error.message : error);
  return Response.json({ error: 'Athena hit an unexpected problem. Your progress is safe; please try again.', code: 'INTERNAL_ERROR' }, { status: 500 });
}
