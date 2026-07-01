import type { Context } from "hono";
import { jsonApiError } from "../../../../infrastructure/http/apiErrorResponse.js";

export type PublicLeadRateLimiter = {
  check: (input: PublicLeadRateLimitInput) => PublicLeadRateLimitResult;
};

export type PublicLeadRateLimitInput = {
  clientKey: string;
  listingSlug: string;
  storeSlug: string;
};

export type PublicLeadRateLimitResult =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function createMemoryPublicLeadRateLimiter(
  options = {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000,
  },
): PublicLeadRateLimiter {
  const attempts = new Map<string, number[]>();

  return {
    check(input) {
      const now = Date.now();
      const key = [input.storeSlug, input.listingSlug, input.clientKey].join(
        ":",
      );
      const recent = (attempts.get(key) ?? []).filter(
        (attempt) => now - attempt < options.windowMs,
      );

      if (recent.length >= options.maxAttempts) {
        const oldestAttempt = recent[0] ?? now;
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil(
            (options.windowMs - (now - oldestAttempt)) / 1000,
          ),
        };
      }

      attempts.set(key, [...recent, now]);
      return { allowed: true };
    },
  };
}

export function resolvePublicLeadClientKey(context: Context): string {
  return (
    context.req.header("cf-connecting-ip") ??
    context.req.header("x-real-ip") ??
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitPublicLeadRequest(
  context: Context,
  limiter: PublicLeadRateLimiter,
  input: { listingSlug: string; storeSlug: string },
): Response | null {
  const result = limiter.check({
    clientKey: resolvePublicLeadClientKey(context),
    listingSlug: input.listingSlug,
    storeSlug: input.storeSlug,
  });

  if (result.allowed) return null;
  context.header("Retry-After", String(result.retryAfterSeconds));
  return jsonApiError(context, {
    code: "PUBLIC_LEAD_RATE_LIMITED",
    details: { retryAfterSeconds: result.retryAfterSeconds },
    message: "Too many lead requests.",
    status: 429,
  });
}
