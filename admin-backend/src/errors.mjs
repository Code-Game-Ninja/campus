export class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED', details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asHttpError(error) {
  if (error instanceof HttpError) return error;
  return new HttpError(500, error instanceof Error ? error.message : 'Unexpected server error.', 'INTERNAL_ERROR');
}
