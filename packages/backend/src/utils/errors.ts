export class NotFoundError extends Error {
  statusCode = 404;
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}
