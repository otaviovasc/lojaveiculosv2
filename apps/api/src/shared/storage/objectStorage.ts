export type CreateObjectUploadInput = {
  contentType: string;
  fileName: string;
  scopeSegments: readonly string[];
  sizeBytes: number;
};

export type PutStorageObjectInput = {
  body: Uint8Array;
  contentType: string;
  fileName: string;
  scopeSegments: readonly string[];
};

export type CreateObjectDownloadInput = {
  disposition?: "attachment" | "inline";
  fileName: string;
  mimeType: string | null;
  storageKey: string;
};

export type DeleteStorageObjectInput = {
  storageKey: string;
};

export type ObjectUpload = {
  expiresAt: Date;
  publicUrl: string;
  storageKey: string;
  uploadHeaders: Record<string, string>;
  uploadMethod: "PUT";
  uploadUrl: string;
};

export type StoredObject = {
  publicUrl: string;
  storageKey: string;
};

export type ObjectDownload = {
  downloadMethod: "GET";
  downloadUrl: string;
  expiresAt: Date;
};

export type ObjectStorage = {
  close?: () => Promise<void> | void;
  createDownload: (input: CreateObjectDownloadInput) => Promise<ObjectDownload>;
  createUpload: (input: CreateObjectUploadInput) => Promise<ObjectUpload>;
  deleteObject?: (input: DeleteStorageObjectInput) => Promise<void>;
  getPublicUrl: (storageKey: string) => string;
  putObject: (input: PutStorageObjectInput) => Promise<StoredObject>;
};

export class StorageObjectNotFoundError extends Error {
  constructor() {
    super("Stored object was not found.");
    this.name = "StorageObjectNotFoundError";
  }
}
