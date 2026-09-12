export class SpedyGatewayConfigurationError extends Error {
  constructor(readonly missingConfiguration: readonly string[]) {
    super(
      `SPEDY fiscal gateway is not configured: ${missingConfiguration.join(", ")}`,
    );
    this.name = "SpedyGatewayConfigurationError";
  }
}

export class SpedyGatewayHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SpedyGatewayHttpError";
  }
}
