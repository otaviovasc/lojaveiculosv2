import { describe, expect, it } from "vitest";
import { splitVehicleCatalogName } from "./catalogNameNormalization.js";

const runLive = process.env.RUN_LIVE_FIPE_CATALOG_TESTS === "true";
const baseUrl =
  process.env.FIPE_API_BASE_URL ?? "https://parallelum.com.br/fipe/api/v2";

describe.skipIf(!runLive)("live FIPE catalog name normalization", () => {
  it("validates BMW X3 splits from the raw FIPE model response", async () => {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/cars/brands/7/models`,
      {
        headers: process.env.FIPE_API_TOKEN
          ? { "X-Subscription-Token": process.env.FIPE_API_TOKEN }
          : {},
      },
    );
    expect(response.status).toBe(200);
    const rawModels = (await response.json()) as Array<{
      code: string | number;
      name: string;
    }>;
    const byName = new Map(rawModels.map((model) => [model.name, model]));

    expectSplitFromRaw(byName, {
      family: "X3",
      name: "X3 XDRIVE 30 M Sport 2.0 TB Aut.",
      version: "XDRIVE 30 M Sport 2.0 TB Aut.",
    });
    expectSplitFromRaw(byName, {
      family: "X3",
      name: "X3 M40i 3.0 M Sport Edit. V6 Turbo Aut.",
      version: "M40i 3.0 M Sport Edit. V6 Turbo Aut.",
    });
  });
});

function expectSplitFromRaw(
  rawModels: ReadonlyMap<string, { name: string }>,
  expected: { family: string; name: string; version: string },
) {
  const rawModel = rawModels.get(expected.name);
  expect(rawModel, `Missing live FIPE model ${expected.name}`).toBeTruthy();
  expect(splitVehicleCatalogName(rawModel?.name ?? "")).toEqual({
    modelFamilyName: expected.family,
    versionName: expected.version,
  });
}
