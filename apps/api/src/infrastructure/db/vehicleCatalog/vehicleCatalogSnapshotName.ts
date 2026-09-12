export function vehicleCatalogSnapshotModelName(input: {
  familyName: string;
  providerName?: string | null;
  versionName: string;
}) {
  const providerName = input.providerName?.trim();
  if (providerName) return providerName;

  const familyName = input.familyName.trim();
  const versionName = input.versionName.trim();
  if (!familyName) return versionName;
  if (!versionName) return familyName;

  const familyKey = compactName(familyName);
  const versionKey = compactName(versionName);
  if (familyKey === versionKey || versionKey.startsWith(familyKey)) {
    return versionName;
  }
  return `${familyName} ${versionName}`;
}

export function vehicleCatalogSnapshotModelNameFromVersion(
  familyName: string,
  version: { name: string; providerName?: string | null },
) {
  return vehicleCatalogSnapshotModelName({
    familyName,
    providerName: version.providerName ?? null,
    versionName: version.name,
  });
}

function compactName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}
