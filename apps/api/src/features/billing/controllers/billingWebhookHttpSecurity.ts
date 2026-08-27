import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Context } from "hono";
import type { BillingWebhookRateLimiter } from "../../../domains/billing/ports/billingWebhookRateLimiter.js";

export const asaasWebhookMaxBytes = 128 * 1024;
const maxDepth = 8;
const maxNodes = 1_000;
const maxKeys = 500;
const maxRecordKeys = 100;
const maxArrayItems = 100;
const maxStringLength = 16_384;

export class BillingWebhookPayloadTooLargeError extends Error {
  constructor() {
    super("Webhook payload is too large.");
    this.name = "BillingWebhookPayloadTooLargeError";
  }
}

export class BillingWebhookStructureError extends Error {
  constructor(message = "Webhook body is invalid.") {
    super(message);
    this.name = "BillingWebhookStructureError";
  }
}

export class BillingWebhookRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many billing webhook requests.");
    this.name = "BillingWebhookRateLimitedError";
  }
}

export async function rateLimitAsaasWebhook(
  context: Context,
  limiter: BillingWebhookRateLimiter,
  token: string,
) {
  const result = await limiter.consume({
    provider: "asaas",
    sourceFingerprint: sourceFingerprint(context, token),
  });
  if (!result.allowed) {
    throw new BillingWebhookRateLimitedError(result.retryAfterSeconds);
  }
}

export async function parseBoundedAsaasWebhook(
  context: Context,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(context.req.header("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > asaasWebhookMaxBytes
  ) {
    throw new BillingWebhookPayloadTooLargeError();
  }

  const bytes = await context.req.arrayBuffer();
  if (bytes.byteLength > asaasWebhookMaxBytes) {
    throw new BillingWebhookPayloadTooLargeError();
  }

  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new BillingWebhookStructureError();
  }
  assertBoundedStructure(input);
  return input;
}

function assertBoundedStructure(
  input: unknown,
): asserts input is Record<string, unknown> {
  if (!isRecord(input)) throw new BillingWebhookStructureError();
  let nodes = 0;
  let keys = 0;
  const visit = (value: unknown, depth: number): void => {
    nodes += 1;
    if (nodes > maxNodes || depth > maxDepth) {
      throw new BillingWebhookStructureError(
        "Webhook structure exceeds limits.",
      );
    }
    if (typeof value === "string" && value.length > maxStringLength) {
      throw new BillingWebhookStructureError("Webhook string exceeds limits.");
    }
    if (Array.isArray(value)) {
      if (value.length > maxArrayItems) {
        throw new BillingWebhookStructureError("Webhook array exceeds limits.");
      }
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!isRecord(value)) return;
    const entries = Object.entries(value);
    keys += entries.length;
    if (entries.length > maxRecordKeys || keys > maxKeys) {
      throw new BillingWebhookStructureError("Webhook object exceeds limits.");
    }
    for (const [, child] of entries) visit(child, depth + 1);
  };
  visit(input, 0);
  assertEnvelope(input);
}

function assertEnvelope(input: Record<string, unknown>) {
  const id = input.id;
  const event = input.event;
  if (!isBoundedIdentifier(id, 256) || !isBoundedIdentifier(event, 128)) {
    throw new BillingWebhookStructureError("Webhook envelope is invalid.");
  }
  for (const field of ["payment", "checkout", "subscription"] as const) {
    if (input[field] !== undefined && !isRecord(input[field])) {
      throw new BillingWebhookStructureError(`${field} must be an object.`);
    }
  }
  assertOptionalString(input.dateCreated, "dateCreated");
  const required = event.startsWith("PAYMENT_")
    ? "payment"
    : event.startsWith("CHECKOUT_")
      ? "checkout"
      : event.startsWith("SUBSCRIPTION_")
        ? "subscription"
        : null;
  if (required && !isRecord(input[required])) {
    throw new BillingWebhookStructureError(`${required} is required.`);
  }
  if (isRecord(input.payment)) assertPayment(input.payment);
  if (isRecord(input.checkout)) assertCheckout(input.checkout);
  if (isRecord(input.subscription)) assertSubscription(input.subscription);
}

function assertPayment(payment: Record<string, unknown>) {
  assertEntityId(payment, "payment");
  const numericValue =
    typeof payment.value === "string" ? Number(payment.value) : payment.value;
  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    throw new BillingWebhookStructureError("payment.value is invalid.");
  }
  for (const field of [
    "checkout",
    "checkoutSession",
    "customer",
    "dueDate",
    "externalReference",
    "subscription",
  ]) {
    assertOptionalString(payment[field], `payment.${field}`);
  }
}

function assertCheckout(checkout: Record<string, unknown>) {
  assertEntityId(checkout, "checkout");
  for (const field of ["customer", "status"]) {
    assertOptionalString(checkout[field], `checkout.${field}`);
  }
  const subscription = checkout.subscription;
  if (
    subscription !== undefined &&
    subscription !== null &&
    typeof subscription !== "string" &&
    !isRecord(subscription)
  ) {
    throw new BillingWebhookStructureError("checkout.subscription is invalid.");
  }
}

function assertSubscription(subscription: Record<string, unknown>) {
  assertEntityId(subscription, "subscription");
  for (const field of ["externalReference", "nextDueDate", "status"]) {
    assertOptionalString(subscription[field], `subscription.${field}`);
  }
}

function assertEntityId(entity: Record<string, unknown>, path: string) {
  if (!isBoundedIdentifier(entity.id, 256)) {
    throw new BillingWebhookStructureError(`${path}.id is required.`);
  }
}

function assertOptionalString(value: unknown, path: string) {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== "string" || value.length > maxStringLength)
  ) {
    throw new BillingWebhookStructureError(`${path} is invalid.`);
  }
}

function sourceFingerprint(context: Context, token: string) {
  const address = resolveClientAddress(context);
  const tokenFingerprint = createHash("sha256").update(token).digest("hex");
  return createHash("sha256")
    .update(`asaas\0${address}\0${tokenFingerprint}`)
    .digest("hex");
}

function resolveClientAddress(context: Context) {
  const candidate =
    context.req.header("cf-connecting-ip") ??
    context.req.header("x-real-ip") ??
    context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "";
  return isIP(candidate) ? candidate.toLowerCase() : "unresolved";
}

function isBoundedIdentifier(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= limit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
