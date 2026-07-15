import { describe, expect, it, vi } from "vitest";
import { resetLocalDatabases } from "./reset-local-databases-core.mjs";

describe("local database reset orchestration", () => {
  it("loads env and checks safety before destroying local volumes", () => {
    const events = [];

    resetLocalDatabases({
      assertSafe: (operation) => events.push(["safe", operation]),
      assertSeedWrites: () => events.push(["r2-safe"]),
      environment: { R2_BUCKET_NAME: "test-bucket" },
      execute: (command, args) => events.push([command, ...args]),
      loadEnvironment: () => events.push(["env"]),
      packageManager: "pnpm",
    });

    expect(events).toEqual([
      ["env"],
      ["safe", "db:reset:local"],
      ["r2-safe"],
      ["docker", "compose", "down", "-v"],
      [
        "docker",
        "compose",
        "up",
        "-d",
        "--wait",
        "lojaveiculosv2-postgres",
        "lojaveiculosv2-audit-postgres",
        "lojaveiculosv2-redis",
      ],
      ["pnpm", "run", "db:push:local"],
      ["pnpm", "run", "db:seed:local"],
    ]);
  });

  it("does not execute a mutation when the safety check fails", () => {
    const execute = vi.fn();

    expect(() =>
      resetLocalDatabases({
        assertSafe: () => {
          throw new Error("unsafe database");
        },
        execute,
        loadEnvironment: vi.fn(),
      }),
    ).toThrow("unsafe database");
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not destroy local volumes when the R2 write guard fails", () => {
    const execute = vi.fn();

    expect(() =>
      resetLocalDatabases({
        assertSafe: vi.fn(),
        assertSeedWrites: () => {
          throw new Error("unsafe R2 bucket");
        },
        environment: { R2_BUCKET_NAME: "configured-bucket" },
        execute,
        loadEnvironment: vi.fn(),
      }),
    ).toThrow("unsafe R2 bucket");
    expect(execute).not.toHaveBeenCalled();
  });
});
