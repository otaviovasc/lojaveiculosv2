import {
  blockAllowEndMarker,
  blockAllowStartMarker,
  blockAllowStartPattern,
  fileAllowMarker,
  fileAllowMarkerPattern,
  legacyAllowMarker,
  legacyAllowMarkerPattern,
} from "./duplicate-config.mjs";
import { lineNumberAt } from "./duplicate-source-blocks.mjs";

export function prepareDuplicateSource(source, rel, failures) {
  if (fileAllowMarkerPattern.test(source)) return null;

  if (legacyAllowMarkerPattern.test(source)) {
    failures.push(
      `${rel} uses broad ${legacyAllowMarker}. Use ${blockAllowStartMarker}: <reason> plus ${blockAllowEndMarker}, or ${fileAllowMarker}: <reason> for generated/data-only files.`,
    );
    return source;
  }

  if (
    source.includes(blockAllowStartMarker) ||
    source.includes(blockAllowEndMarker)
  ) {
    return stripAllowedBlocks(source, rel, failures);
  }

  return source;
}

function stripAllowedBlocks(source, rel, failures) {
  let output = "";
  let cursor = 0;
  let matchedStart = false;
  blockAllowStartPattern.lastIndex = 0;

  for (const match of source.matchAll(blockAllowStartPattern)) {
    matchedStart = true;
    const start = match.index;
    const endMarkerIndex = source.indexOf(blockAllowEndMarker, start);
    if (endMarkerIndex === -1) {
      failures.push(
        `${rel}:${lineNumberAt(source, start)} opens ${blockAllowStartMarker} without ${blockAllowEndMarker}.`,
      );
      continue;
    }

    const endLineIndex = source.indexOf("\n", endMarkerIndex);
    const end = endLineIndex === -1 ? source.length : endLineIndex + 1;
    output += source.slice(cursor, start);
    output += "\n".repeat(source.slice(start, end).split("\n").length - 1);
    cursor = end;
  }

  if (source.includes(blockAllowEndMarker) && !matchedStart) {
    failures.push(`${rel} uses ${blockAllowEndMarker} without a start marker.`);
  }

  return output + source.slice(cursor);
}
