import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaWebhookChallengeInput = {
  challenge?: string;
  expectedVerifyToken: string;
  mode?: string;
  verifyToken?: string;
};

export type MetaWebhookChallengeResult =
  | { challenge: string; ok: true }
  | {
      ok: false;
      reason: "invalid_mode" | "invalid_token" | "missing_challenge";
    };

export function verifyMetaWebhookChallenge({
  challenge,
  expectedVerifyToken,
  mode,
  verifyToken,
}: MetaWebhookChallengeInput): MetaWebhookChallengeResult {
  if (mode !== "subscribe") return { ok: false, reason: "invalid_mode" };
  if (!secureTextEqual(verifyToken, expectedVerifyToken)) {
    return { ok: false, reason: "invalid_token" };
  }
  if (!challenge) return { ok: false, reason: "missing_challenge" };
  return { challenge, ok: true };
}

export type MetaWebhookSignatureInput = {
  appSecret: string;
  rawBody: string | Uint8Array;
  signatureHeader?: string;
};

export function verifyMetaWebhookSignature({
  appSecret,
  rawBody,
  signatureHeader,
}: MetaWebhookSignatureInput): boolean {
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const hexSignature = signatureHeader.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/u.test(hexSignature)) return false;
  const received = Buffer.from(hexSignature, "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

function secureTextEqual(received: string | undefined, expected: string) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
