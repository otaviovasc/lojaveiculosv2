export class ExternalApiIdempotencyReplay extends Error {
  constructor(
    readonly body: unknown,
    readonly contentType: string,
    readonly statusCode: number,
  ) {
    super("Replay a completed external API response.");
    this.name = "ExternalApiIdempotencyReplay";
  }
}
