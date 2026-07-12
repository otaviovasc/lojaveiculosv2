import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { adminRoutePaths } from "./adminRoutePaths";

const reservedPublicStoreSlugs = new Set([
  "account",
  "admin",
  "agency",
  "api",
  "auth",
  "dashboard",
  "identity",
  "onboarding",
  "platform",
  "sign-in",
  "sign-up",
  ...adminRoutePaths.map((path) => path.replace(/^\//, "")),
]);

export function isReservedPublicStoreSlug(storeSlug: string | undefined) {
  return Boolean(storeSlug && reservedPublicStoreSlugs.has(storeSlug));
}

export function PublicStorefrontSlugGuard({
  children,
  reservedFallback,
}: {
  children: ReactNode;
  reservedFallback: ReactNode;
}) {
  const { storeSlug } = useParams();
  if (!isReservedPublicStoreSlug(storeSlug)) return children;
  return reservedFallback;
}
