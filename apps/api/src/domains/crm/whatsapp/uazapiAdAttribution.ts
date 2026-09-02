import { readNumber, readRecord, readString } from "./zapiPayloadRead.js";
import {
  normalizeUazapiInboundData,
  parseUazapiContent,
} from "./uazapiPayloadData.js";
import type { ZapiAdAttribution } from "./zapiAdAttribution.js";

export type UazapiAdAttribution = ZapiAdAttribution;

/**
 * Normalize Uazapi Click-to-WhatsApp attribution into the same
 * provider-neutral contract used by Z-API. Uazapi deployments expose both
 * flat fields and Baileys-style `contextInfo` fields on `data` and `content`.
 */
export function parseUazapiAdAttribution(
  payload: Record<string, unknown>,
  options: { detectedAt?: Date } = {},
): UazapiAdAttribution | null {
  const data = normalizeUazapiInboundData(payload);
  const content = parseUazapiContent(data.content);

  const contextCandidates: Record<string, unknown>[] = [];
  const addContext = (value: unknown) => {
    const record = readRecord(value);
    if (Object.keys(record).length > 0) contextCandidates.push(record);
  };
  addContext(data.contextInfo);
  addContext(data.context_info);
  addContext(content?.contextInfo);
  addContext(content?.context_info);
  if (content) {
    for (const value of Object.values(content)) {
      const node = readRecord(value);
      addContext(node.contextInfo);
      addContext(node.context_info);
    }
  }

  const external = firstRecord(
    data.externalAdReply,
    data.external_ad_reply,
    content?.externalAdReply,
    content?.external_ad_reply,
    ...contextCandidates.flatMap((context) => [
      context.externalAdReply,
      context.external_ad_reply,
    ]),
  );
  const ctwa = firstRecord(
    data.ctwaContext,
    data.ctwa_context,
    content?.ctwaContext,
    content?.ctwa_context,
    ...contextCandidates.flatMap((context) => [
      context.ctwaContext,
      context.ctwa_context,
    ]),
  );
  const referral = ctwa
    ? firstRecord(ctwa.referral, ctwa.referral_context)
    : undefined;

  const externalIsAd =
    readString(external?.sourceType)?.toLowerCase() === "ad" ||
    readString(external?.source_type)?.toLowerCase() === "ad";
  const hasCtwa = Boolean(
    ctwa &&
    (readString(ctwa.sourceId) ??
      readString(ctwa.conversationType) ??
      readString(referral?.sourceId) ??
      readString(referral?.sourceType)),
  );
  if (!externalIsAd && !hasCtwa) return null;

  const source = externalIsAd ? external : (referral ?? ctwa);
  return {
    adBody: firstString(source?.body, ctwa?.body) ?? null,
    adConversationType:
      firstString(
        external?.sourceType,
        ctwa?.conversationType,
        referral?.sourceType,
      ) ?? null,
    adDetectedAt: (options.detectedAt ?? new Date()).toISOString(),
    adDetectionMethod: externalIsAd ? "external_ad_reply" : "ctwa_context",
    adMediaType:
      readNumber(source?.mediaType) ?? readString(source?.mediaType) ?? null,
    adSourceApp: firstString(source?.sourceApp, ctwa?.sourceApp) ?? null,
    adSourceId:
      firstString(external?.sourceId, referral?.sourceId, ctwa?.sourceId) ??
      null,
    adSourceUrl: firstString(source?.sourceUrl, ctwa?.sourceUrl) ?? null,
    adThumbnailUrl:
      firstString(source?.thumbnailUrl, ctwa?.thumbnailUrl) ?? null,
    adTitle: firstString(source?.title, source?.headline, ctwa?.title) ?? null,
    ctwaClid: firstString(source?.ctwaClid, ctwa?.ctwaClid) ?? null,
    isAdInitiated: true,
    renderLargerThumbnail: readBoolean(source?.renderLargerThumbnail),
    showAdAttribution: readBoolean(source?.showAdAttribution),
  };
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = readRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = readString(value);
    if (text) return text;
  }
  return undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}
