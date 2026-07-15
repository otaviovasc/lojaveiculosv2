export const defaultMaxLines = 250;
export const frontendAdditionalLines = 300;
export const frontendMaxLines = defaultMaxLines + frontendAdditionalLines;
export const frontendPathPrefix = "apps/web/";
export const legacyDebtPathPrefix = frontendPathPrefix;

export function maxLinesForPath(path, maxLines = defaultMaxLines) {
  return path.startsWith(frontendPathPrefix)
    ? maxLines + frontendAdditionalLines
    : maxLines;
}

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
    const fileMaxLines = maxLinesForPath(path, maxLines);
    if (!path.startsWith(legacyDebtPathPrefix)) {
      failures.push(
        `${path}: debt exceptions are limited to ${legacyDebtPathPrefix}.`,
      );
    }
    if (
      !Number.isInteger(exception?.maxLines) ||
      exception.maxLines <= fileMaxLines
    ) {
      failures.push(
        `${path}: debt ceiling must be an integer greater than ${fileMaxLines}.`,
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
    const fileMaxLines = maxLinesForPath(file.path, maxLines);
    const exception = debtFiles[file.path];
    if (file.lines <= fileMaxLines) {
      if (exception) {
        failures.push(
          `${file.path}: stale debt exception; file is now ${file.lines} lines.`,
        );
      }
      continue;
    }
    if (!exception) {
      failures.push(`${file.path}: ${file.lines} > ${fileMaxLines}.`);
      continue;
    }
    const debtCeiling = exception?.maxLines;
    if (!Number.isInteger(debtCeiling) || debtCeiling <= fileMaxLines) {
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
