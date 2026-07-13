export const defaultMaxLines = 250;
export const legacyDebtPathPrefix = "apps/web/";

export function findFileLineViolations(
  files,
  debt,
  maxLines = defaultMaxLines,
) {
  const failures = [];
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const debtFiles = debt?.files ?? {};
  const reasons = debt?.reasons ?? {};
  const referencedReasons = new Set();

  for (const [path, exception] of Object.entries(debtFiles)) {
    if (!path.startsWith(legacyDebtPathPrefix)) {
      failures.push(
        `${path}: debt exceptions are limited to ${legacyDebtPathPrefix}.`,
      );
    }
    if (
      !Number.isInteger(exception?.maxLines) ||
      exception.maxLines <= maxLines
    ) {
      failures.push(
        `${path}: debt ceiling must be an integer greater than ${maxLines}.`,
      );
    }
    const reason =
      typeof exception?.reason === "string" ? exception.reason : "";
    const reasonDescription = reasons?.[reason];
    if (
      !reason ||
      typeof reasonDescription !== "string" ||
      !reasonDescription.trim()
    ) {
      failures.push(
        `${path}: debt exception must reference a documented reason.`,
      );
    } else {
      referencedReasons.add(reason);
    }
    if (!filesByPath.has(path)) {
      failures.push(`${path}: stale debt exception for a missing file.`);
    }
  }

  for (const reason of Object.keys(reasons)) {
    if (!referencedReasons.has(reason)) {
      failures.push(`${reason}: stale unreferenced debt reason.`);
    }
  }

  for (const file of files) {
    const exception = debtFiles[file.path];
    if (file.lines <= maxLines) {
      if (exception) {
        failures.push(
          `${file.path}: stale debt exception; file is now ${file.lines} lines.`,
        );
      }
      continue;
    }
    if (!exception) {
      failures.push(`${file.path}: ${file.lines} > ${maxLines}.`);
      continue;
    }
    const debtCeiling = exception?.maxLines;
    if (!Number.isInteger(debtCeiling) || debtCeiling <= maxLines) {
      continue;
    }
    if (file.lines > debtCeiling) {
      failures.push(
        `${file.path}: ${file.lines} exceeds debt ceiling ${debtCeiling}.`,
      );
    } else if (file.lines < debtCeiling) {
      failures.push(
        `${file.path}: debt ceiling ${debtCeiling} exceeds current line count ${file.lines}; lower the ceiling to prevent regrowth.`,
      );
    }
  }

  return failures;
}
