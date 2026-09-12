export class ExternalBotError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 503,
  ) {
    super(message);
    this.name = "ExternalBotError";
  }
}

export function botError(
  code: string,
  message: string,
  status: ExternalBotError["status"],
) {
  return new ExternalBotError(message, code, status);
}
