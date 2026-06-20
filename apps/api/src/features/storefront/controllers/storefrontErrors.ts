export class StorefrontRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontRequestValidationError";
  }
}
