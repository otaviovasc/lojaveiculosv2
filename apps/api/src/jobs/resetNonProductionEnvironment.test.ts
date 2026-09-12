import { describe, expect, it, vi } from "vitest";
import {
  resetNonProductionEnvironment,
  type ResetResourceAdapter,
} from "./resetNonProductionEnvironment.js";

describe("reset non-production environment", () => {
  it("only inspects resources during the default dry-run", async () => {
    const adapters = [fakeAdapter("product"), fakeAdapter("audit")];
    const report = vi.fn();

    await resetNonProductionEnvironment(
      { apply: false, environment: "staging" },
      adapters,
      report,
    );

    expect(adapters[0]?.inspect).toHaveBeenCalledOnce();
    expect(adapters[1]?.inspect).toHaveBeenCalledOnce();
    expect(adapters[0]?.reset).not.toHaveBeenCalled();
    expect(adapters[1]?.reset).not.toHaveBeenCalled();
    expect(adapters[0]?.close).toHaveBeenCalledOnce();
    expect(adapters[1]?.close).toHaveBeenCalledOnce();
  });

  it("applies resources in the declared order after all inspections", async () => {
    const events: string[] = [];
    const adapters = ["product", "audit", "redis", "r2"].map((name) =>
      fakeAdapter(name, events),
    );

    await resetNonProductionEnvironment(
      { apply: true, environment: "staging" },
      adapters,
      () => undefined,
    );

    expect(events).toEqual([
      "inspect:product",
      "inspect:audit",
      "inspect:redis",
      "inspect:r2",
      "reset:product",
      "reset:audit",
      "reset:redis",
      "reset:r2",
    ]);
  });
});

function fakeAdapter(
  name: string,
  events: string[] = [],
): ResetResourceAdapter & {
  close: ReturnType<typeof vi.fn>;
  inspect: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
} {
  return {
    close: vi.fn(async () => undefined),
    inspect: vi.fn(async () => {
      events.push(`inspect:${name}`);
      return { rows: 1 };
    }),
    name,
    reset: vi.fn(async () => {
      events.push(`reset:${name}`);
      return { rows: 0 };
    }),
  };
}
