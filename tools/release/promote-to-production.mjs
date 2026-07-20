import { spawnSync } from "node:child_process";

if (runGit(["status", "--porcelain"]).trim()) {
  fail(
    "Promote to production requires a clean worktree. Commit or stash first.",
  );
}

runGit(["fetch", "origin", "staging", "main"]);

const stagingTip = runGit(["rev-parse", "origin/staging"]).trim();
const mainTip = runGit(["rev-parse", "origin/main"]).trim();
if (stagingTip === mainTip) {
  fail(
    "origin/staging and origin/main already point at the same commit. Nothing to promote.",
  );
}

const existing = spawnSync(
  "gh",
  [
    "pr",
    "list",
    "--base",
    "main",
    "--head",
    "staging",
    "--json",
    "url",
    "--jq",
    ".[0].url",
  ],
  { encoding: "utf8" },
);
if (existing.status !== 0) {
  fail(
    existing.stderr.trim() ||
      "gh pr list failed. Is the GitHub CLI authenticated?",
  );
}
const existingUrl = existing.stdout.trim();
if (existingUrl) {
  console.info(`A staging -> main release PR already exists: ${existingUrl}`);
} else {
  run("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    "staging",
    "--title",
    `Release: staging@${stagingTip.slice(0, 12)} -> main`,
    "--fill",
  ]);
}

console.info(`
Next steps:
  1. Confirm the main-source-guard check passes on the PR, then merge it.
  2. Merging triggers the Railway production auto-deploy.
  3. Wait for the API and web deployments to reach SUCCESS, then verify the
     first CRM schedule worker cron execution exits successfully.
  4. Run: pnpm run release:smoke:production
  5. Watch Railway logs, HTTP metrics, and Sentry for the release window.
`);

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(" ")} failed.`);
  }
  return result.stdout;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed.`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
