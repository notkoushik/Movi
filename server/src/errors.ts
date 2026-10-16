export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

export function validationError(fields: Record<string, string>) {
  return new HttpError(
    400,
    "VALIDATION_ERROR",
    "Please correct the highlighted fields.",
    fields,
  )
}
