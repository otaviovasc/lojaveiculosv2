const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15_000;
const JITTER_MS = 250;

export type ZapiRateLimitRetryOptions = {
  maxRetries?: number;
  now?: () => number;
  random?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function fetchZapiWithRateLimitRetry(
  request: () => Promise<Response>,
  options: ZapiRateLimitRetryOptions = {},
): Promise<Response> {
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;
  let retryCount = 0;

  while (true) {
    const response = await request();
    if (response.status !== 429 || retryCount >= maxRetries) {
      return response;
    }

    const providerDelayMs = readRetryAfterMs(response.headers, now());
    const fallbackDelayMs =
      BASE_DELAY_MS * 2 ** retryCount + Math.floor(random() * JITTER_MS);
    const delayMs = Math.max(
      BASE_DELAY_MS,
      Math.min(providerDelayMs ?? fallbackDelayMs, MAX_DELAY_MS),
    );

    retryCount += 1;
    await response.body?.cancel().catch(() => undefined);
    await sleep(delayMs);
  }
}

export function readRetryAfterSeconds(
  headers: Headers,
  nowMs: number = Date.now(),
): number | undefined {
  const milliseconds = readRetryAfterMs(headers, nowMs);
  return milliseconds === undefined
    ? undefined
    : Math.max(1, Math.ceil(milliseconds / 1_000));
}

function readRetryAfterMs(headers: Headers, nowMs: number): number | undefined {
  const rawValue = headers.get("retry-after")?.trim();
  if (!rawValue) return undefined;

  const seconds = Number(rawValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const retryAtMs = Date.parse(rawValue);
  if (!Number.isFinite(retryAtMs)) return undefined;
  return Math.max(0, retryAtMs - nowMs);
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
