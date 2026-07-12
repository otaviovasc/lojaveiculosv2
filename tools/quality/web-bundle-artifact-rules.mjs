import { extname } from "node:path";

const executableExtensions = new Set([".cjs", ".js", ".mjs"]);

export function findWebBundleArtifactViolations(input) {
  const { files, manifest, manifestError, policy } = input;
  const failures = [];
  const paths = new Set(files.map((file) => file.path));

  if (manifestError) {
    failures.push(`bundle manifest is invalid: ${manifestError}`);
  } else if (
    !manifest ||
    Array.isArray(manifest) ||
    typeof manifest !== "object"
  ) {
    failures.push("bundle manifest must be a JSON object");
  } else {
    const entries = Object.values(manifest).filter(
      (value) => value && typeof value === "object" && value.isEntry === true,
    );
    if (entries.length === 0) {
      failures.push("bundle manifest must contain a production entry chunk");
    }
    for (const entry of entries) {
      if (typeof entry.file !== "string" || !paths.has(entry.file)) {
        failures.push(
          `bundle manifest entry is missing output ${entry.file ?? "<unknown>"}`,
        );
      }
    }
  }

  if (!paths.has("index.html")) failures.push("bundle must contain index.html");

  let ordinaryJavascriptFiles = 0;
  let stylesheetFiles = 0;
  for (const file of files) {
    if (file.type !== "file") {
      failures.push(
        `${file.path}: bundle output must not contain ${file.type}`,
      );
      continue;
    }
    if (!Number.isInteger(file.sizeBytes) || file.sizeBytes < 0) {
      failures.push(
        `${file.path}: artifact size must be a non-negative integer`,
      );
      continue;
    }

    const worker = policy.workerExceptions.find(({ pattern }) =>
      new RegExp(pattern).test(file.path),
    );
    if (worker) {
      expectWithinBudget(file, worker.maxBytes, `worker:${worker.id}`);
      continue;
    }

    const extension = extname(file.path).toLowerCase();
    if (file.path.includes(".worker.") && executableExtensions.has(extension)) {
      failures.push(
        `${file.path}: executable worker has no reviewed exception`,
      );
      continue;
    }
    if (executableExtensions.has(extension)) {
      ordinaryJavascriptFiles += 1;
      expectWithinBudget(file, policy.limits.javascript, "javascript");
    } else if (extension === ".css") {
      stylesheetFiles += 1;
      expectWithinBudget(file, policy.limits.stylesheet, "stylesheet");
    } else if (!policy.staticExtensions.includes(extension)) {
      failures.push(
        `${file.path}: unclassified bundle artifact extension ${extension || "<none>"}`,
      );
    }
  }

  if (ordinaryJavascriptFiles === 0) {
    failures.push("bundle must contain ordinary JavaScript output");
  }
  if (stylesheetFiles === 0)
    failures.push("bundle must contain stylesheet output");
  return failures;

  function expectWithinBudget(file, maxBytes, kind) {
    if (file.sizeBytes > maxBytes) {
      failures.push(
        `${file.path}: ${kind} artifact is ${file.sizeBytes} bytes; budget is ${maxBytes} bytes`,
      );
    }
  }
}

export function summarizeMeasuredBundle(files, policy) {
  const measured = files
    .filter((file) => file.type === "file")
    .map((file) => ({ ...file, kind: classify(file.path, policy) }))
    .filter((file) => file.kind !== null);
  return {
    javascript: largest(measured, "javascript"),
    stylesheet: largest(measured, "stylesheet"),
    worker: largest(measured, "worker"),
  };
}

function classify(path, policy) {
  if (
    policy.workerExceptions.some(({ pattern }) =>
      new RegExp(pattern).test(path),
    )
  ) {
    return "worker";
  }
  const extension = extname(path).toLowerCase();
  if (executableExtensions.has(extension)) return "javascript";
  if (extension === ".css") return "stylesheet";
  return null;
}

function largest(files, kind) {
  return (
    files
      .filter((file) => file.kind === kind)
      .sort((left, right) => right.sizeBytes - left.sizeBytes)[0] ?? null
  );
}
