import { readNumber, readRecord, readString } from "./zapiPayloadRead.js";

export type ZapiAdAttribution = {
  adBody: string | null;
  adConversationType: string | null;
  adDetectedAt: string;
  adDetectionMethod:
    | "ctwa_context"
    | "external_ad_reply"
    | "lid_fallback"
    | "notification_webhook";
  adMediaType: number | string | null;
  adSourceApp: string | null;
  adSourceId: string | null;
  adSourceUrl: string | null;
  adThumbnailUrl: string | null;
  adTitle: string | null;
  ctwaClid: string | null;
  isAdInitiated: true;
  renderLargerThumbnail: boolean | null;
  showAdAttribution: boolean | null;
};

export function parseZapiAdAttribution(
  payload: Record<string, unknown>,
  options: { detectedAt?: Date; notification: boolean },
): ZapiAdAttribution | null {
  const external = readRecord(payload.externalAdReply);
  const ctwa = readRecord(payload.ctwaContext);
  const referral = readRecord(ctwa.referral);
  const externalIsAd = readString(external.sourceType)?.toLowerCase() === "ad";
  const hasCtwa = hasCtwaAttribution(ctwa, referral);
  const lidFallback =
    !options.notification &&
    !externalIsAd &&
    !hasCtwa &&
    isLidAdFallback(payload);
  if (!externalIsAd && !hasCtwa && !lidFallback) return null;

  const source = externalIsAd ? external : referral;
  return {
    adBody: firstString(source.body, ctwa.body) ?? null,
    adConversationType:
      firstString(
        external.sourceType,
        ctwa.conversationType,
        referral.sourceType,
      ) ?? null,
    adDetectedAt: (options.detectedAt ?? new Date()).toISOString(),
    adDetectionMethod: detectionMethod({
      externalIsAd,
      hasCtwa,
      lidFallback,
      notification: options.notification,
    }),
    adMediaType:
      readNumber(source.mediaType) ?? readString(source.mediaType) ?? null,
    adSourceApp: firstString(source.sourceApp, ctwa.sourceApp) ?? null,
    adSourceId:
      firstString(external.sourceId, referral.sourceId, ctwa.sourceId) ?? null,
    adSourceUrl: firstString(source.sourceUrl, ctwa.sourceUrl) ?? null,
    adThumbnailUrl: firstString(source.thumbnailUrl, ctwa.thumbnailUrl) ?? null,
    adTitle:
      firstString(source.title, source.headline, ctwa.title, ctwa.headline) ??
      null,
    ctwaClid: firstString(source.ctwaClid, ctwa.ctwaClid) ?? null,
    isAdInitiated: true,
    renderLargerThumbnail: readBoolean(source.renderLargerThumbnail),
    showAdAttribution: readBoolean(source.showAdAttribution),
  };
}

export function isZapiNotificationPayload(payload: Record<string, unknown>) {
  return (
    payload.notification === true ||
    typeof payload.notification === "string" ||
    payload.type === "notification"
  );
}

function hasCtwaAttribution(
  ctwa: Record<string, unknown>,
  referral: Record<string, unknown>,
) {
  return Boolean(
    firstString(
      ctwa.sourceId,
      ctwa.conversationType,
      referral.sourceId,
      referral.sourceType,
    ),
  );
}

function isLidAdFallback(payload: Record<string, unknown>) {
  const chatLid = readString(payload.chatLid) ?? readString(payload.senderLid);
  const phone = readString(payload.phone);
  if (!chatLid || !phone) return false;
  const digits = phone.replace(/@[a-z.]+$/i, "").replace(/[^\d]/g, "");
  return (
    /@lid/i.test(phone) ||
    digits.length > 15 ||
    Boolean(digits && /^(\d)\1+$/.test(digits))
  );
}

function detectionMethod(input: {
  externalIsAd: boolean;
  hasCtwa: boolean;
  lidFallback: boolean;
  notification: boolean;
}): ZapiAdAttribution["adDetectionMethod"] {
  if (input.notification) return "notification_webhook";
  if (input.lidFallback) return "lid_fallback";
  if (input.externalIsAd) return "external_ad_reply";
  return "ctwa_context";
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
