export class ProviderEventRetryError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422,
  ) {
    super(message);
    this.name = "ProviderEventRetryError";
  }
}
