import { createHash } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import type { CrmRemoteMediaFetcher } from "../ports/crmRemoteMediaFetcher.js";
import type { CrmWhatsappRepository } from "../ports/crmWhatsappRepository.js";

export type MirrorZapiProfilePhotoInput = {
  connectionId: string;
  contactIdentity: string;
  photoUrl?: string;
  remoteMediaFetcher?: CrmRemoteMediaFetcher | null | undefined;
  storage?: ObjectStorage | null | undefined;
  storeId: StoreId;
  tenantId: TenantId;
};

export type MirrorZapiProfilePhotoResult =
  | { profilePhotoUrl: string; status: "stored"; storageKey: string }
  | { errorName?: string; status: "failed" | "unavailable" };

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const supportedContentTypes = new Map([
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function mirrorNewZapiProfilePhoto(
  input: MirrorZapiProfilePhotoInput & {
    buyerChatLid?: string;
    buyerName?: string;
    buyerPhone: string;
    repository: CrmWhatsappRepository;
  },
) {
  const existingSession = await input.repository.findSessionByIdentity({
    ...(input.buyerChatLid ? { buyerChatLid: input.buyerChatLid } : {}),
    ...(input.buyerName ? { buyerName: input.buyerName } : {}),
    buyerPhone: input.buyerPhone,
    channel: "WHATSAPP",
    connectionId: input.connectionId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  return mirrorZapiProfilePhoto({
    connectionId: input.connectionId,
    contactIdentity: input.contactIdentity,
    ...(!hasOwnedProfilePhoto(existingSession?.metadata) && input.photoUrl
      ? { photoUrl: input.photoUrl }
      : {}),
    remoteMediaFetcher: input.remoteMediaFetcher,
    storage: input.storage,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

export async function mirrorZapiProfilePhoto(
  input: MirrorZapiProfilePhotoInput,
): Promise<MirrorZapiProfilePhotoResult> {
  if (!input.photoUrl || !input.remoteMediaFetcher || !input.storage) {
    return { status: "unavailable" };
  }

  try {
    const remote = await input.remoteMediaFetcher.fetchMedia({
      maxBytes: MAX_PROFILE_PHOTO_BYTES,
      url: input.photoUrl,
    });
    const contentType = remote.contentType?.split(";")[0]?.trim().toLowerCase();
    const extension = contentType && supportedContentTypes.get(contentType);
    if (!contentType || !extension) {
      return {
        errorName: "UnsupportedProfilePhotoContentType",
        status: "failed",
      };
    }
    const stored = await input.storage.putObject({
      body: remote.body,
      contentType,
      fileName: `profile.${extension}`,
      scopeSegments: [
        "crm",
        "whatsapp",
        input.tenantId,
        input.storeId,
        input.connectionId,
        "profiles",
        profileIdentityDigest(input.connectionId, input.contactIdentity),
      ],
    });
    return {
      profilePhotoUrl: stored.publicUrl,
      status: "stored",
      storageKey: stored.storageKey,
    };
  } catch (error) {
    return {
      errorName: error instanceof Error ? error.name : "UnknownError",
      status: "failed",
    };
  }
}

function hasOwnedProfilePhoto(metadata?: Record<string, unknown>) {
  const profilePhoto = metadata?.profilePhoto;
  return Boolean(
    profilePhoto &&
    typeof profilePhoto === "object" &&
    !Array.isArray(profilePhoto) &&
    typeof (profilePhoto as Record<string, unknown>).storageKey === "string",
  );
}

function profileIdentityDigest(connectionId: string, contactIdentity: string) {
  return createHash("sha256")
    .update(`${connectionId}:${contactIdentity.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}
