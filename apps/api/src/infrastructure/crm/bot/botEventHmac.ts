import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type SignedBotEvent = {
  body: string;
  headers: Readonly<Record<string, string>>;
};

export function signExternalBotEvent(input: {
  body: string;
  now: Date;
  secret: string;
  nonce?: string;
}): SignedBotEvent {
  const timestamp = Math.floor(input.now.getTime() / 1_000).toString();
  const nonce = input.nonce ?? randomBytes(18).toString("base64url");
  const bodyDigest = createHash("sha256").update(input.body).digest("hex");
  const canonical = [timestamp, nonce, bodyDigest].join(".");
  const signature = createHmac("sha256", input.secret)
    .update(canonical)
    .digest("hex");
  return {
    body: input.body,
    headers: {
      "content-type": "application/json",
      "x-crm-bot-body-sha256": bodyDigest,
      "x-crm-bot-nonce": nonce,
      "x-crm-bot-signature": `v1=${signature}`,
      "x-crm-bot-timestamp": timestamp,
    },
  };
}

export interface ExternalBotNonceStore {
  consume(nonce: string, expiresAt: Date): Promise<boolean>;
}

export async function verifyExternalBotEventSignature(input: {
  body: string;
  headers: Readonly<Record<string, string | undefined>>;
  maxAgeSeconds?: number;
  nonceStore: ExternalBotNonceStore;
  now: Date;
  secret: string;
}) {
  const timestamp = input.headers["x-crm-bot-timestamp"];
  const nonce = input.headers["x-crm-bot-nonce"];
  const receivedDigest = input.headers["x-crm-bot-body-sha256"];
  const signature = input.headers["x-crm-bot-signature"];
  if (
    !timestamp ||
    !nonce ||
    !receivedDigest ||
    !signature?.startsWith("v1=")
  ) {
    return { kind: "invalid" } as const;
  }
  const epochSeconds = Number(timestamp);
  const maxAgeSeconds = input.maxAgeSeconds ?? 300;
  if (
    !Number.isSafeInteger(epochSeconds) ||
    Math.abs(input.now.getTime() / 1_000 - epochSeconds) > maxAgeSeconds
  ) {
    return { kind: "expired" } as const;
  }
  const actualDigest = createHash("sha256").update(input.body).digest("hex");
  if (!safeEqual(actualDigest, receivedDigest))
    return { kind: "invalid" } as const;
  const expected = createHmac("sha256", input.secret)
    .update([timestamp, nonce, actualDigest].join("."))
    .digest("hex");
  if (!safeEqual(expected, signature.slice(3)))
    return { kind: "invalid" } as const;
  const consumed = await input.nonceStore.consume(
    nonce,
    new Date((epochSeconds + maxAgeSeconds) * 1_000),
  );
  return consumed
    ? ({ kind: "verified" } as const)
    : ({ kind: "replay" } as const);
}

export function createMemoryExternalBotNonceStore(): ExternalBotNonceStore {
  const nonces = new Map<string, Date>();
  return {
    consume: async (nonce, expiresAt) => {
      if (nonces.has(nonce)) return false;
      nonces.set(nonce, expiresAt);
      return true;
    },
  };
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
