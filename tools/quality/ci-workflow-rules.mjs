export const requiredCiActions = [
  {
    name: "actions/checkout",
    ref: "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
    version: "v7",
  },
  {
    name: "pnpm/action-setup",
    ref: "0ebf47130e4866e96fce0953f49152a61190b271",
    version: "v6",
  },
  {
    name: "actions/setup-node",
    ref: "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
    version: "v6",
  },
];

export function findCiWorkflowViolations(source) {
  const failures = [];
  const lines = source.split(/\r?\n/);
  const actionLines = lines.flatMap((line, index) => {
    const match = /^\s*uses:\s*([^\s#]+)(?:\s+#\s*(\S+))?\s*$/.exec(line);
    return match
      ? [{ line: index + 1, uses: match[1], version: match[2] }]
      : [];
  });

  if (/^\s*pull_request_target\s*:/m.test(source)) {
    failures.push("CI must not run untrusted code through pull_request_target");
  }
  if (!hasReadOnlyPermissions(lines)) {
    failures.push("CI must grant only contents: read to GITHUB_TOKEN");
  }
  const runners = lineValues(lines, "runs-on");
  if (
    runners.length === 0 ||
    runners.some(({ value }) => value !== "ubuntu-24.04")
  ) {
    failures.push("every CI runner image must be pinned to ubuntu-24.04");
  }

  const timeouts = lineValues(lines, "timeout-minutes").map(({ value }) =>
    Number(value),
  );
  if (
    timeouts.length !== runners.length ||
    timeouts.some(
      (timeout) => !Number.isInteger(timeout) || timeout < 1 || timeout > 30,
    )
  ) {
    failures.push("every CI job must set timeout-minutes between 1 and 30");
  }

  for (const action of actionLines) {
    if (action.uses.startsWith("./") || action.uses.startsWith("docker://")) {
      continue;
    }
    const ref = action.uses.slice(action.uses.lastIndexOf("@") + 1);
    if (!/^[0-9a-f]{40}$/.test(ref)) {
      failures.push(`line ${action.line}: action must use a full commit SHA`);
    }
  }

  for (const required of requiredCiActions) {
    const uses = `${required.name}@${required.ref}`;
    const matches = actionLines.filter((action) => action.uses === uses);
    if (matches.length !== 1 || matches[0]?.version !== required.version) {
      failures.push(
        `${uses} must appear once with comment ${required.version}`,
      );
    }
  }

  const checkout = `${requiredCiActions[0].name}@${requiredCiActions[0].ref}`;
  if (!stepSource(lines, checkout).includes("persist-credentials: false")) {
    failures.push(
      "checkout credentials must not persist after the checkout step",
    );
  }
  if (!source.includes("pnpm install --frozen-lockfile")) {
    failures.push("CI dependency installation must use the frozen lockfile");
  }
  return failures;
}

export function findDependabotActionsViolations(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, ""))
    .filter((line) => line.trim());
  const failures = [];
  if (!lines.some((line) => /^version:\s*2\s*$/.test(line))) {
    failures.push("Dependabot configuration must use version 2");
  }
  const start = lines.findIndex((line) =>
    /^\s*-\s*package-ecosystem:\s*["']?github-actions["']?\s*$/.test(line),
  );
  const end = lines.findIndex(
    (line, index) => index > start && /^\s*-\s*package-ecosystem:/.test(line),
  );
  const block = lines.slice(start, end < 0 ? undefined : end).join("\n");
  if (start < 0) {
    failures.push("Dependabot must monitor the github-actions ecosystem");
    return failures;
  }
  if (!/^\s*directory:\s*["']?\/["']?\s*$/m.test(block)) {
    failures.push("Dependabot github-actions directory must be /");
  }
  if (!/^\s*interval:\s*["']?weekly["']?\s*$/m.test(block)) {
    failures.push("Dependabot must update GitHub Actions weekly");
  }
  return failures;
}

function hasReadOnlyPermissions(lines) {
  const blocks = lines.flatMap((line, index) =>
    /^(\s*)permissions:\s*$/.test(line)
      ? [{ indent: line.match(/^\s*/)[0].length, start: index }]
      : [],
  );
  if (blocks.length !== 1 || blocks[0].indent !== 0) return false;
  const { start } = blocks[0];
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const trimmed = line.trim();
    if (trimmed) entries.push(trimmed);
  }
  return entries.length === 1 && entries[0] === "contents: read";
}

function lineValues(lines, key) {
  const matcher = new RegExp(`^\\s*${key}:\\s*([^#]+?)\\s*(?:#.*)?$`);
  return lines.flatMap((line, index) => {
    const match = matcher.exec(line);
    return match ? [{ line: index + 1, value: match[1].trim() }] : [];
  });
}

function stepSource(lines, uses) {
  const start = lines.findIndex((line) => line.includes(`uses: ${uses}`));
  if (start < 0) return "";
  const end = lines.findIndex(
    (line, index) => index > start && /^\s{6}- name:/.test(line),
  );
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}
