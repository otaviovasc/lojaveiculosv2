export type OlxCatalogEntry = { code: string; name: string };

export function matchOlxBrand(
  entries: OlxCatalogEntry[],
  target: string,
): OlxCatalogEntry | undefined {
  const exact = entries.filter(
    (entry) => compactName(entry.name) === compactName(target),
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;

  const aliases = brandAliases(target);
  const ranked = entries
    .flatMap((entry) => {
      const entryName = compactName(entry.name);
      const alias = aliases.find((candidate) => candidate === entryName);
      return alias ? [{ entry, score: alias.length }] : [];
    })
    .sort((left, right) => right.score - left.score);

  if (!ranked[0] || ranked[0].score === ranked[1]?.score) return undefined;
  return ranked[0].entry;
}

export function matchOlxModel(
  entries: OlxCatalogEntry[],
  target: string,
  brandName?: string,
): OlxCatalogEntry | undefined {
  const targets = [target, stripBrandPrefix(target, brandName)].filter(
    (value, index, values) => value && values.indexOf(value) === index,
  );
  const candidates = entries.flatMap((entry) => {
    const entryName = compactName(entry.name);
    const match = targets.find((candidate) => {
      const normalizedTarget = compactName(candidate);
      return (
        normalizedTarget === entryName ||
        (normalizedTarget.startsWith(entryName) &&
          isNameTokenPrefix(candidate, entry.name))
      );
    });
    return match ? [{ entry, target: match }] : [];
  });

  const ranked = candidates.sort(
    (left, right) =>
      compactName(right.entry.name).length -
      compactName(left.entry.name).length,
  );
  if (
    ranked[0] &&
    ranked[1] &&
    compactName(ranked[0].entry.name).length ===
      compactName(ranked[1].entry.name).length
  ) {
    return undefined;
  }
  return ranked[0]?.entry;
}

export function matchOlxVersion(
  entries: OlxCatalogEntry[],
  target: string,
  providerModelName: string,
): OlxCatalogEntry | undefined {
  const acceptedNames = versionNames(target, providerModelName);
  const exactMatches = entries.filter((entry) =>
    acceptedNames.some((name) => compactName(name) === compactName(entry.name)),
  );
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return undefined;

  const ranked = entries
    .map((entry) => ({
      entry,
      score: Math.max(
        ...acceptedNames.map((name) => versionScore(name, entry.name)),
      ),
    }))
    .filter(({ score }) => score >= 0.78)
    .sort((left, right) => right.score - left.score);

  if (!ranked[0]) return undefined;
  if (ranked[1] && ranked[0].score - ranked[1].score < 0.12) {
    return undefined;
  }
  return ranked[0].entry;
}

function brandAliases(value: string) {
  return [value, ...value.split(/[\/|]/u)]
    .map((candidate) => compactName(candidate))
    .filter(Boolean)
    .filter((candidate, index, values) => values.indexOf(candidate) === index);
}

function stripBrandPrefix(value: string, brandName?: string) {
  if (!brandName) return value;
  const targetWords = matchWords(value);
  const brandWords = brandName
    .split(/[\/|]/u)
    .map(matchWords)
    .sort((left, right) => right.length - left.length)
    .find(
      (candidate) =>
        candidate.length > 0 &&
        candidate.every((word, index) => targetWords[index] === word),
    );
  if (brandWords) {
    return targetWords.slice(brandWords.length).join(" ");
  }
  return value;
}

function versionNames(target: string, providerModelName: string) {
  const names = [target];
  const normalizedTarget = compactName(target);
  const normalizedModel = compactName(providerModelName);
  if (normalizedTarget.startsWith(normalizedModel)) {
    const targetWords = rawWords(target);
    const modelWords = rawWords(providerModelName);
    const versionOnlyName = targetWords.slice(modelWords.length).join(" ");
    if (versionOnlyName && !names.includes(versionOnlyName)) {
      names.push(versionOnlyName);
    }
  }
  return names;
}

function versionScore(left: string, right: string) {
  const leftTokens = matchWords(left);
  const rightTokens = matchWords(right);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const coverage = overlap / leftSet.size;
  const precision = overlap / rightSet.size;

  if (conflictingTrim(leftTokens, rightTokens)) return 0;
  return coverage * 0.65 + precision * 0.35;
}

function conflictingTrim(left: string[], right: string[]) {
  const leftTrim = trimSignature(left);
  const rightTrim = trimSignature(right);
  return Boolean(leftTrim && rightTrim && leftTrim !== rightTrim);
}

function trimSignature(tokens: string[]) {
  const ignored = new Set([
    "AUTOMATICO",
    "FLEX",
    "TURBO",
    "DIESEL",
    "GASOLINA",
    "MANUAL",
    "ELETRICO",
    "HIBRIDO",
  ]);
  const first = tokens.find(
    (token) => !ignored.has(token) && !/^\d+(?:\.\d+)?V?$/u.test(token),
  );
  return first ?? "";
}

function isNameTokenPrefix(target: string, prefix: string) {
  const targetWords = matchWords(target);
  const prefixWords = matchWords(prefix);
  return (
    prefixWords.length < targetWords.length &&
    prefixWords.every((word, index) => word === targetWords[index])
  );
}

function matchWords(value: string) {
  return rawWords(value).map((rawToken) => {
    const token = rawToken.replace(/\.$/u, "");
    if (["AUT", "AUTOM", "AUTOMATIC", "AT"].includes(token)) {
      return "AUTOMATICO";
    }
    if (["MEC", "MAN", "MT"].includes(token)) return "MANUAL";
    return token;
  });
}

function rawWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d+)\.(\d+)/gu, "$1.$2")
    .replace(/[^A-Za-z0-9.]+/gu, " ")
    .trim()
    .toUpperCase()
    .split(/\s+/u)
    .filter(Boolean);
}

function compactName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}
