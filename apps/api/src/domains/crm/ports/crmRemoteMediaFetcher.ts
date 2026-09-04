export type CrmRemoteMedia = {
  body: Uint8Array;
  contentType: string | null;
  finalUrl: string;
};

export type CrmRemoteMediaFetcher = {
  fetchMedia(input: { maxBytes: number; url: string }): Promise<CrmRemoteMedia>;
  validateUrl(input: { url: string }): Promise<void>;
};

export class UnsafeCrmRemoteMediaUrlError extends Error {
  constructor() {
    super("Remote media URL is not an allowed public HTTPS destination.");
    this.name = "UnsafeCrmRemoteMediaUrlError";
  }
}
