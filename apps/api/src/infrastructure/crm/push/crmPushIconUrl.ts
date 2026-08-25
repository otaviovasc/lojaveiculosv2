export function resolveCrmPushIconUrl(
  profilePhotoUrl: string | null,
  publicAppUrl: string,
): string {
  const fallback = `${publicAppUrl.replace(/\/$/, "")}/icons/logo_lv.png`;
  if (!profilePhotoUrl?.trim()) return fallback;
  try {
    const allowedOrigin = new URL(publicAppUrl);
    const candidate = new URL(profilePhotoUrl);
    if (
      (allowedOrigin.protocol !== "https:" &&
        allowedOrigin.protocol !== "http:") ||
      candidate.origin !== allowedOrigin.origin ||
      candidate.username ||
      candidate.password
    ) {
      return fallback;
    }
    return candidate.href;
  } catch {
    return fallback;
  }
}
