import type {
  StoreSettingsSnapshot,
  UpdateStoreSettingsInput,
} from "./types";

export function createStoreSettingsPatch(
  before: StoreSettingsSnapshot,
  after: StoreSettingsSnapshot,
): UpdateStoreSettingsInput {
  const input: UpdateStoreSettingsInput = {};
  const identity = changedFields(before.identity, after.identity);
  const profile = changedFields(before.profile, after.profile);
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
