import { spawnSync } from "node:child_process";

const featureBranch = runGit(["branch", "--show-current"]).trim();
if (!featureBranch) {
  fail("Promote to staging requires a named Git branch.");
}
if (featureBranch === "staging" || featureBranch === "main") {
  fail(`Run this script from a feature branch, not from ${featureBranch}.`);
}

if (runGit(["status", "--porcelain"]).trim()) {
  fail("Promote to staging requires a clean worktree. Commit or stash first.");
}

run("pnpm", ["run", "release:verify"]);

runGit(["fetch", "origin"]);
const remoteStagingExists =
  spawnSync("git", ["rev-parse", "--verify", "origin/staging"], {
    encoding: "utf8",
  }).status === 0;
if (!remoteStagingExists) {
  console.info(
    "origin/staging does not exist yet; bootstrapping it from origin/main.",
  );
  run("git", ["branch", "-f", "staging", "origin/main"]);
} else {
  ensureLocalStaging();
}

run("git", ["checkout", "staging"]);
if (remoteStagingExists) {
  run("git", ["merge", "--ff-only", "origin/staging"]);
}
run("git", ["merge", "--no-ff", "--edit", featureBranch]);
run("git", ["push", "origin", "staging"]);
run("git", ["checkout", featureBranch]);

console.info(`
Promoted ${featureBranch} to staging. Railway now auto-deploys the staging environment.
Next steps:
  1. Wait for the API and web deployments to reach SUCCESS in Railway.
  2. Verify the first CRM schedule worker cron execution exits successfully.
  3. Run: pnpm run release:smoke:staging
  4. Test the flows on staging, then run: pnpm run release:promote
`);

function ensureLocalStaging() {
  const exists =
    spawnSync("git", ["rev-parse", "--verify", "staging"], {
      encoding: "utf8",
    }).status === 0;
  if (!exists) {
    run("git", ["branch", "--track", "staging", "origin/staging"]);
  }
}

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
