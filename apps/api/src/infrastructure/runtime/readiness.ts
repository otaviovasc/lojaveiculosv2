export type ReadinessState = "not_ready" | "ready";

export type ReadinessResult = {
  checks: Record<string, ReadinessState>;
  ok: boolean;
};

export type ReadinessCheck = {
  name: string;
  run: () => Promise<void>;
};

export type DatabaseProbeClient = {
  unsafe: (query: string) => Promise<unknown>;
};

const defaultReadinessTimeoutMs = 2_000;

export function createReadinessProbe(
  checks: readonly ReadinessCheck[],
  timeoutMs = defaultReadinessTimeoutMs,
): () => Promise<ReadinessResult> {
  return async () => {
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          await runWithTimeout(check.run, timeoutMs);
          return [check.name, "ready"] as const;
        } catch {
          return [check.name, "not_ready"] as const;
        }
      }),
    );
    const statuses = Object.fromEntries(results);

    return {
      checks: statuses,
      ok: Object.values(statuses).every((status) => status === "ready"),
    };
  };
}

export function readReadinessTimeoutMs(
  env: Record<string, string | undefined>,
): number {
  const configured = Number(env.READINESS_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : defaultReadinessTimeoutMs;
}

export function createDatabaseReadinessCheck(
  name: string,
  client: DatabaseProbeClient,
): ReadinessCheck {
  return {
    name,
    run: async () => {
      await client.unsafe("select 1");
    },
  };
}

async function runWithTimeout(
  run: () => Promise<void>,
  timeoutMs: number,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error("Readiness check timed out.")),
      timeoutMs,
    );
    timer.unref?.();
  });

  try {
    await Promise.race([run(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
