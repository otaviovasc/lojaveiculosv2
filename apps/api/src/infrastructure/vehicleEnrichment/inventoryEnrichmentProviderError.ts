export class InventoryEnrichmentProviderError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InventoryEnrichmentProviderError";
    this.statusCode = statusCode;
  }
}
