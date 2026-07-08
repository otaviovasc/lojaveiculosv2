import type {
  MarketplaceProvider,
  MarketplaceServiceErrorCode,
} from "../../ports/marketplaceRepository.js";

export type MarketplaceServiceErrorInput = {
  code: MarketplaceServiceErrorCode;
  details?: Record<string, unknown>;
  jobId?: string;
  listingId?: string;
  message: string;
  provider?: MarketplaceProvider;
  requestId?: string;
  retryAfterSeconds?: number;
  status: number;
  userAction: string;
};

export class MarketplaceServiceError extends Error {
  readonly code: MarketplaceServiceErrorCode;
  readonly details?: Record<string, unknown>;
  readonly jobId?: string;
  readonly listingId?: string;
  readonly provider?: MarketplaceProvider;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  readonly status: number;
  readonly userAction: string;

  constructor(input: MarketplaceServiceErrorInput) {
    super(input.message);
    this.name = "MarketplaceServiceError";
    this.code = input.code;
    if (input.details !== undefined) this.details = input.details;
    if (input.jobId !== undefined) this.jobId = input.jobId;
    if (input.listingId !== undefined) this.listingId = input.listingId;
    if (input.provider !== undefined) this.provider = input.provider;
    if (input.requestId !== undefined) this.requestId = input.requestId;
    if (input.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = input.retryAfterSeconds;
    }
    this.status = input.status;
    this.userAction = input.userAction;
  }
}
