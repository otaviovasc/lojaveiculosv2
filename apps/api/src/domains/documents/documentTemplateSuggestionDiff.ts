import type { DocumentTemplateSuggestionDiff } from "./ports/documentTemplateSuggestionProvider.js";

export function createDocumentTemplateSuggestionDiff(
  before: readonly string[],
  after: readonly string[],
): readonly DocumentTemplateSuggestionDiff[] {
  const max = Math.max(before.length, after.length);
  const diff: DocumentTemplateSuggestionDiff[] = [];
  for (let index = 0; index < max; index += 1) {
    const previous = before[index] ?? "";
    const next = after[index] ?? "";
    if (previous === next) continue;
    diff.push({
      after: next,
      before: previous,
      label: `Clausula ${index + 1}`,
      type: previous ? (next ? "changed" : "removed") : "added",
    });
  }
  return diff;
}
