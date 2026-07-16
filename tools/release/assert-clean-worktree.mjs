import { spawnSync } from "node:child_process";

const status = runGit(["status", "--porcelain"]);
if (status.trim()) {
  console.error(
    "Release verification requires a clean worktree so Railway receives an identifiable commit.",
  );
  process.exit(1);
}

const commit = runGit(["rev-parse", "--verify", "HEAD"]).trim();
const branch = runGit(["branch", "--show-current"]).trim();
if (!branch) {
  console.error("Release verification requires a named Git branch.");
  process.exit(1);
}

console.info(`Release source verified: ${branch}@${commit.slice(0, 12)}`);

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr.trim() || "Git release preflight failed.");
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}
