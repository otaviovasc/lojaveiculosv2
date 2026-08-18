import { normalizeContactIdentity } from "../core/normalizeIdentity.js";
import type {
  CanonicalInboundMessageInput,
  CanonicalInboundMessageResult,
} from "../ports/crmCanonicalInboundRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export function persistCanonicalInbound(
  ports: CrmServicePorts,
  input: Omit<
    CanonicalInboundMessageInput,
    | "externalThreadAliases"
    | "customerChatId"
    | "leadId"
    | "mediaType"
    | "mediaUrl"
    | "metadata"
    | "profilePhotoStorageKey"
    | "profilePhotoUrl"
    | "secondaryPhone"
    | "senderOrigin"
    | "sessionMetadata"
    | "source"
  > & {
    customerChatId?: string | null;
    externalThreadAliases?: readonly string[];
    leadId?: string | null;
    mediaType?: string | null;
    mediaUrl?: string | null;
    metadata?: Readonly<Record<string, unknown>>;
    profilePhotoStorageKey?: string | null;
    profilePhotoUrl?: string | null;
    secondaryPhone?: string | null;
    senderOrigin?: "customer" | "system";
    sessionMetadata?: Readonly<Record<string, unknown>>;
    source?: string | null;
  },
): Promise<CanonicalInboundMessageResult> {
  const repository = ports.crmCanonicalInboundRepository;
  if (!repository) {
    throw new Error("Canonical CRM inbound repository is unavailable.");
  }
  const normalizedIdentity = normalizeContactIdentity(
    input.identity.kind,
    input.identity.normalizedValue,
  );
  if (!normalizedIdentity) {
    throw new Error("Canonical CRM inbound identity is empty.");
  }
  const secondaryPhone = input.secondaryPhone
    ? normalizeContactIdentity("phone", input.secondaryPhone)
    : null;
  return repository.ingestInboundMessage({
    ...input,
    customerChatId: input.customerChatId ?? null,
    externalThreadAliases: normalizeThreadAliases(
      input.externalThreadId,
      input.externalThreadAliases ?? [],
    ),
    identity: { ...input.identity, normalizedValue: normalizedIdentity },
    leadId: input.leadId ?? null,
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    metadata: sanitizeCanonicalMetadata(input.metadata ?? {}),
    profilePhotoStorageKey: input.profilePhotoStorageKey ?? null,
    profilePhotoUrl: input.profilePhotoUrl ?? null,
    secondaryPhone: secondaryPhone || null,
    senderOrigin: input.senderOrigin ?? input.sender,
    sessionMetadata: sanitizeCanonicalMetadata(input.sessionMetadata ?? {}),
    source: input.source ?? null,
  });
}

function normalizeThreadAliases(
  canonicalId: string,
  aliases: readonly string[],
): readonly string[] {
  const unprefixed = canonicalId.match(/^(?:lid|phone):(.+)$/u)?.[1];
  const phoneDigits = canonicalId.startsWith("phone:")
    ? unprefixed?.replace(/\D/gu, "")
    : null;
  return [
    ...new Set([
      ...aliases.map((value) => value.trim()),
      ...(unprefixed ? [unprefixed] : []),
      ...(phoneDigits ? [phoneDigits, `+${phoneDigits}`] : []),
    ]),
  ].filter((value) => value && value !== canonicalId && value.length <= 191);
}

const sensitiveMetadataKey =
  /(?:authorization|cookie|credential|password|secret|token)/iu;

export function sanitizeCanonicalMetadata(
  metadata: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return sanitizeRecord(metadata, 0);
}

function sanitizeRecord(
  value: Readonly<Record<string, unknown>>,
  depth: number,
): Record<string, unknown> {
  if (depth >= 4) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveMetadataKey.test(key))
      .slice(0, 40)
      .flatMap(([key, item]) => {
        const sanitized =
          typeof item === "string" && /url$/iu.test(key)
            ? sanitizeMetadataUrl(item)
            : sanitizeValue(item, depth + 1);
        return sanitized === undefined ? [] : [[key, sanitized]];
      }),
  );
}

function sanitizeMetadataUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number")
    return value;
  if (typeof value === "string") return value.slice(0, 1_000);
  if (Array.isArray(value))
    return value
      .slice(0, 20)
      .map((item) => sanitizeValue(item, depth))
      .filter((item) => item !== undefined);
  if (value && typeof value === "object")
    return sanitizeRecord(value as Readonly<Record<string, unknown>>, depth);
  return undefined;
}
