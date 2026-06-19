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

export type ObjectStorage = {
  createUpload: (input: CreateObjectUploadInput) => Promise<ObjectUpload>;
  getPublicUrl: (storageKey: string) => string;
  putObject: (input: PutStorageObjectInput) => Promise<StoredObject>;
};
