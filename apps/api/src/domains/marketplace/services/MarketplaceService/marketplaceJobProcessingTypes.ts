export type ProcessMarketplaceJobsInput = {
  force?: boolean;
  jobId?: string;
  limit?: number;
  now?: Date;
  reconcileOnly?: boolean;
};

export type ProcessMarketplaceJobsResult = {
  failed: number;
  processed: number;
  queued: number;
  submitted: number;
  succeeded: number;
};
