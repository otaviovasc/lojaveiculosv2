import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const local = process.argv.includes("--local");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const shutdownTimeoutMs = readPositiveNumber(
  process.env.DEV_SUPERVISOR_SHUTDOWN_TIMEOUT_MS,
  10_000,
);
const processSpecs = createProcessSpecs(local);
assertPortsAvailable(processSpecs);
const children = processSpecs.map(startChild);
let shuttingDown = false;
let exitCode = 0;
let forceTimer = null;

process.once("SIGINT", () => {
  void shutdown("SIGINT", "SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM", "SIGTERM");
});

for (const child of children) {
  child.process.once("exit", (code, signal) => {
    child.exited = true;
    if (shuttingDown) return;

    exitCode = resolveChildExitCode(code, signal);
    void shutdown(`${child.name} exited`, "SIGTERM");
  });
}

function startChild(child) {
  const subprocess = spawn(child.command, child.args, {
    cwd: child.cwd,
    env: { ...process.env, ...child.env },
    stdio: "inherit",
  });

  subprocess.once("error", (error) => {
    console.error(`Failed to start ${child.name}.`, error);
    if (!shuttingDown) {
      exitCode = 1;
      void shutdown(`${child.name} failed to start`, "SIGTERM");
    }
  });

  return {
    ...child,
    exited: false,
    process: subprocess,
  };
}

async function shutdown(reason, signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Stopping dev processes (${reason}).`);

  for (const child of children) {
    signalChild(child, signal);
  }

  forceTimer = setTimeout(() => {
    for (const child of children) {
      signalProcess(child, "SIGKILL");
    }
  }, shutdownTimeoutMs);
  forceTimer.unref?.();

  await Promise.all(children.map(waitForExit));
  if (forceTimer) clearTimeout(forceTimer);
  process.exit(exitCode);
}

function signalChild(child, signal) {
  if (child.exited || !child.process.pid) return;
  signalProcess(child, signal);
}

function signalProcess(child, signal) {
  if (!child.process.pid) return;

  try {
    child.process.kill(signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      console.warn(`Failed to send ${signal} to ${child.name}.`, error);
    }
  }
}

function waitForExit(child) {
  if (child.exited) return Promise.resolve();

  return new Promise((resolve) => {
    child.process.once("exit", () => {
      child.exited = true;
      resolve();
    });
  });
}

function resolveChildExitCode(code, signal) {
  if (code === 130) return 0;
  if (code !== null) return code;
  return signal === "SIGINT" || signal === "SIGTERM" ? 0 : 1;
}

function createProcessSpecs(useLocalEnv) {
  return [
    {
      args: [
        workspaceNodeModulePath("apps/api", "tsx/dist/cli.mjs"),
        "watch",
        "src/main.ts",
      ],
      command: process.execPath,
      cwd: pathFromRoot("apps/api"),
      env: useLocalEnv
        ? {
            APP_ENV: "local",
            AUDIT_DATABASE_URL:
              "postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit",
            CLERK_AUDIENCE: "",
            CLERK_AUTHORIZED_PARTIES: "",
            CLERK_JWT_KEY: "",
            CLERK_SECRET_KEY: "",
            CLERK_WEBHOOK_SECRET: "",
            DATABASE_URL:
              "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2",
            DEV_CLERK_USER_ID: "clerk_seed_owner",
            DEV_STORE_SLUG: "test-store",
            LOCAL_AUTH_BYPASS: "true",
            REPASSES_CRM_LOCAL_DEMO: "true",
          }
        : {},
      name: "api",
      port: readPositiveNumber(process.env.PORT, 8787),
    },
    {
      args: [
        workspaceNodeModulePath("apps/web", "vite/bin/vite.js"),
        "--host",
        "0.0.0.0",
      ],
      command: process.execPath,
      cwd: pathFromRoot("apps/web"),
      env: useLocalEnv
        ? {
            VITE_CLERK_PUBLISHABLE_KEY: "",
            VITE_LOCAL_AUTH_BYPASS: "true",
          }
        : {},
      name: "web",
      port: 5173,
    },
  ];
}

function pathFromRoot(path) {
  return join(workspaceRoot, path);
}

function workspaceNodeModulePath(workspacePath, path) {
  return pathFromRoot(`${workspacePath}/node_modules/${path}`);
}

function readPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assertPortsAvailable(specs) {
  const occupied = [];

  for (const spec of specs) {
    if (!spec.port) continue;
    const listener = findPortListener(spec.port);
    if (listener) {
      occupied.push({ listener, name: spec.name, port: spec.port });
    }
  }

  if (occupied.length === 0) return;

  console.error(
    `Cannot start dev processes because ports are already in use: ${occupied
      .map((item) => `${item.name}:${item.port}`)
      .join(", ")}.`,
  );
  for (const item of occupied) {
    console.error(item.listener);
  }
  process.exit(1);
}

function findPortListener(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}
