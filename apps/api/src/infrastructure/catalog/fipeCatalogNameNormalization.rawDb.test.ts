import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vehicleCatalogRawResponses } from "@lojaveiculosv2/db";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { splitVehicleCatalogName } from "../../domains/vehicle/catalog/catalogNameNormalization.js";
import { loadLocalEnv } from "../config/loadLocalEnv.js";

type RawFipeModel = {
  code: number | string;
  name: string;
};

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_FIPE_CATALOG_DB_TESTS === "true";

let sqlClient: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

describe.skipIf(!runRawDb)("raw FIPE catalog name normalization", () => {
  beforeAll(() => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw FIPE catalog validation",
    ).toBeTruthy();
    sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    db = drizzle(sqlClient);
  });

  afterAll(async () => {
    await sqlClient?.end();
  });

  it("validates BMW X3 splits from the raw models payload saved by sync", async () => {
    const rawModels = await readLatestRawModelsPayload({
      brandCode: "7",
      vehicleType: "cars",
    });
    const x3Models = rawModels.filter((model) => /^X3\s/i.test(model.name));

    expect(
      x3Models.length,
      "Run a FIPE sync with FIPE_CATALOG_SYNC_BRAND_CODES=7 before this validation",
    ).toBeGreaterThan(5);

    const invalidSplits = x3Models
      .map((model) => ({
        model,
        parts: splitVehicleCatalogName(model.name),
      }))
      .filter(
        ({ parts }) =>
          parts.modelFamilyName !== "X3" || /^X3\s/i.test(parts.versionName),
      );

    expect(invalidSplits).toEqual([]);
  });

  it("keeps body styles and trims in version names for captured brand payloads", async () => {
    await expectSplitFromLatestRawModels({
      brandCode: "21",
      family: "500",
      name: "500 Cabrio Flex 1.4 8V Mec.",
      vehicleType: "cars",
      version: "Cabrio Flex 1.4 8V Mec.",
    });
    await expectSplitFromLatestRawModels({
      brandCode: "6",
      family: "A3",
      name: "A3 Sedan Prestige 1.4 TFSI Flex Tip.",
      vehicleType: "cars",
      version: "Sedan Prestige 1.4 TFSI Flex Tip.",
    });
    await expectSplitFromLatestRawModels({
      brandCode: "7",
      family: "M3",
      name: "M3 Cabrio 4.0 32V",
      vehicleType: "cars",
      version: "Cabrio 4.0 32V",
    });
  });

  it("keeps version names stripped across every captured raw models payload", async () => {
    const rows = await getDb()
      .select({
        payload: vehicleCatalogRawResponses.payload,
        requestPath: vehicleCatalogRawResponses.requestPath,
      })
      .from(vehicleCatalogRawResponses)
      .where(
        and(
          eq(vehicleCatalogRawResponses.endpoint, "models"),
          eq(vehicleCatalogRawResponses.httpStatus, 200),
        ),
      )
      .orderBy(desc(vehicleCatalogRawResponses.fetchedAt));

    expect(
      rows.length,
      "No raw FIPE models payloads found; run pnpm --filter @lojaveiculosv2/api catalog:sync first",
    ).toBeGreaterThan(0);

    const invalidSplits = rows.flatMap((row) =>
      toRawModelArray(row.payload).flatMap((model) => {
        const parts = splitVehicleCatalogName(model.name);
        return versionStillStartsWithFamily(parts) ? [row.requestPath] : [];
      }),
    );

    expect([...new Set(invalidSplits)]).toEqual([]);
  });
});

async function readLatestRawModelsPayload(input: {
  brandCode: string;
  vehicleType: "cars" | "motorcycles" | "trucks";
}) {
  const [row] = await getDb()
    .select({ payload: vehicleCatalogRawResponses.payload })
    .from(vehicleCatalogRawResponses)
    .where(
      and(
        eq(vehicleCatalogRawResponses.endpoint, "models"),
        eq(vehicleCatalogRawResponses.httpStatus, 200),
        eq(vehicleCatalogRawResponses.brandCode, input.brandCode),
        eq(vehicleCatalogRawResponses.vehicleType, input.vehicleType),
      ),
    )
    .orderBy(desc(vehicleCatalogRawResponses.fetchedAt))
    .limit(1);

  expect(
    row,
    `No raw FIPE models payload found for ${input.vehicleType} brand ${input.brandCode}`,
  ).toBeTruthy();
  return toRawModelArray(row?.payload);
}

async function expectSplitFromLatestRawModels(input: {
  brandCode: string;
  family: string;
  name: string;
  vehicleType: "cars" | "motorcycles" | "trucks";
  version: string;
}) {
  const rawModels = await readLatestRawModelsPayload(input);
  const rawModel = rawModels.find((model) => model.name === input.name);

  expect(rawModel, `Missing raw FIPE model ${input.name}`).toBeTruthy();
  expect(splitVehicleCatalogName(rawModel?.name ?? "")).toEqual({
    modelFamilyName: input.family,
    versionName: input.version,
  });
}

function toRawModelArray(payload: unknown): RawFipeModel[] {
  expect(
    Array.isArray(payload),
    "Raw FIPE models payload must be an array",
  ).toBe(true);
  return (payload as unknown[]).map((item) => {
    if (!isRawFipeModel(item)) {
      throw new Error("Raw FIPE model row must include code and name.");
    }
    return item;
  });
}

function isRawFipeModel(item: unknown): item is RawFipeModel {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return candidate.code !== undefined && typeof candidate.name === "string";
}

function getDb() {
  expect(db, "Raw FIPE catalog validation DB was not initialized").toBeTruthy();
  return db as ReturnType<typeof drizzle>;
}

function versionStillStartsWithFamily(parts: {
  modelFamilyName: string;
  versionName: string;
}) {
  return normalize(parts.versionName).startsWith(
    `${normalize(parts.modelFamilyName)} `,
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
