export class HttpContextAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpContextAuthenticationError";
  }
}

export class HttpContextAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpContextAuthorizationError";
  }
}

export class HttpContextRequestPolicyError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 409 | 429,
  ) {
    super(message);
    this.name = "HttpContextRequestPolicyError";
  }
}
