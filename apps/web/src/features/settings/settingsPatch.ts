import type { StoreSettingsSnapshot, UpdateStoreSettingsInput } from "./types";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianWhatsappPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";

export function createStoreSettingsDraft(
  settings: StoreSettingsSnapshot,
): StoreSettingsSnapshot {
  return {
    ...settings,
    profile: {
      ...settings.profile,
      ...(settings.profile.addressZipCode
        ? {
            addressZipCode: formatBrazilianZipCode(
              settings.profile.addressZipCode,
            ),
          }
        : {}),
      ...(settings.profile.contactPhone
        ? {
            contactPhone: formatBrazilianPhone(settings.profile.contactPhone),
          }
        : {}),
      ...(settings.profile.documentNumber
        ? {
            documentNumber: formatBrazilianDocument(
              settings.profile.documentNumber,
            ),
          }
        : {}),
      ...(settings.profile.whatsappPhone
        ? {
            whatsappPhone: formatBrazilianWhatsappPhone(
              settings.profile.whatsappPhone,
            ),
          }
        : {}),
    },
  };
}

export function createStoreSettingsPatch(
  before: StoreSettingsSnapshot,
  after: StoreSettingsSnapshot,
): UpdateStoreSettingsInput {
  const input: UpdateStoreSettingsInput = {};
  const beforeDraft = createStoreSettingsDraft(before);
  const afterDraft = createStoreSettingsDraft(after);
  const identity = changedFields(before.identity, after.identity);
  const profile = changedFields(beforeDraft.profile, afterDraft.profile);
  const publicSite = changedFields(before.publicSite, after.publicSite);

  if (identity) input.identity = identity;
  if (profile) input.profile = profile;
  if (publicSite) input.publicSite = publicSite;

  return input;
}

function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
): Partial<T> | undefined {
  const entries = Object.entries(after).filter(
    ([key, value]) => !isEqualJson(before[key], value),
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Partial<T>;
}

function isEqualJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
