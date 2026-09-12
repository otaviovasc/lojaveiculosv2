import type { ProductCrmLead } from "./productCrmTypes";

const AVATAR_METADATA_KEYS = [
  "profilePhotoUrl",
  "avatarUrl",
  "photoUrl",
  "photoURL",
  "imageUrl",
  "imageURL",
  "buyerPhotoUrl",
  "buyerAvatarUrl",
  "buyerPhoto",
  "pfp",
  "picture",
  "avatar",
  "photo",
] as const;

function isHttpUrl(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.length >= 8 &&
    (trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:image/"))
  );
}

export function readLeadAvatarUrl(lead: ProductCrmLead): string | null {
  const metadata = lead.metadata ?? {};
  for (const key of AVATAR_METADATA_KEYS) {
    const raw = metadata[key];
    if (typeof raw === "string" && isHttpUrl(raw)) return raw.trim();
  }
  // also support nested buyer.avatarUrl style if metadata has `buyer`
  const buyer = metadata["buyer"];
  if (buyer && typeof buyer === "object") {
    const rec = buyer as Record<string, unknown>;
    for (const key of AVATAR_METADATA_KEYS) {
      const raw = rec[key];
      if (typeof raw === "string" && isHttpUrl(raw)) return raw.trim();
    }
  }
  return null;
}
