import {
  vehicleCatalogModelFamilies,
  vehicleCatalogVersions,
} from "@lojaveiculosv2/db";
import * as productSchema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { splitVehicleCatalogName } from "../domains/vehicle/catalog/catalogNameNormalization.js";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { slugify } from "../infrastructure/db/vehicleCatalog/drizzleVehicleCatalogSupport.js";

loadLocalEnv();

const dryRun = process.env.FIPE_CATALOG_NORMALIZE_DRY_RUN === "true";

async function main(): Promise<void> {
  const dbClient = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  const db = drizzle(dbClient, { schema: productSchema });
  let versionsChanged = 0;
  let familiesCreated = 0;
  let familiesReused = 0;

  try {
    const versions = await db
      .select({
        brandId: vehicleCatalogVersions.brandId,
        familyId: vehicleCatalogVersions.modelFamilyId,
        id: vehicleCatalogVersions.id,
        name: vehicleCatalogVersions.name,
        providerName: vehicleCatalogVersions.providerName,
        vehicleType: vehicleCatalogVersions.vehicleType,
      })
      .from(vehicleCatalogVersions)
      .where(eq(vehicleCatalogVersions.isActive, true));

    for (const version of versions) {
      const sourceName = version.providerName ?? version.name;
      const nameParts = splitVehicleCatalogName(sourceName);
      const family = await ensureModelFamily(db, {
        brandId: version.brandId,
        name: nameParts.modelFamilyName,
        vehicleType: version.vehicleType,
      });
      familiesCreated += family.created ? 1 : 0;
      familiesReused += family.created ? 0 : 1;

      if (
        family.id === version.familyId &&
        nameParts.versionName === version.name
      ) {
        continue;
      }
      versionsChanged += 1;
      if (dryRun) continue;

      await db
        .update(vehicleCatalogVersions)
        .set({
          modelFamilyId: family.id,
          name: nameParts.versionName,
          slug: slugify(nameParts.versionName),
        })
        .where(eq(vehicleCatalogVersions.id, version.id));
    }

    const inactiveFamilies = dryRun ? 0 : await deactivateEmptyFamilies(db);
    console.log(
      JSON.stringify({
        dryRun,
        familiesCreated,
        familiesReused,
        inactiveFamilies,
        versionsChanged,
        versionsSeen: versions.length,
      }),
    );
  } finally {
    await dbClient.end();
  }
}

async function ensureModelFamily(
  db: ReturnType<typeof drizzle<typeof productSchema>>,
  input: {
    brandId: string;
    name: string;
    vehicleType: "cars" | "motorcycles" | "trucks";
  },
): Promise<{ created: boolean; id: string }> {
  const slug = slugify(input.name);
  const [existing] = await db
    .select()
    .from(vehicleCatalogModelFamilies)
    .where(
      and(
        eq(vehicleCatalogModelFamilies.brandId, input.brandId),
        eq(vehicleCatalogModelFamilies.slug, slug),
      ),
    );
  if (existing) {
    if (!dryRun) {
      await db
        .update(vehicleCatalogModelFamilies)
        .set({
          isActive: true,
          name: input.name,
          vehicleType: input.vehicleType,
        })
        .where(eq(vehicleCatalogModelFamilies.id, existing.id));
    }
    return { created: false, id: existing.id };
  }
  if (dryRun) return { created: true, id: `dry-run:${input.brandId}:${slug}` };

  const [created] = await db
    .insert(vehicleCatalogModelFamilies)
    .values({
      brandId: input.brandId,
      isActive: true,
      name: input.name,
      slug,
      vehicleType: input.vehicleType,
    })
    .returning({ id: vehicleCatalogModelFamilies.id });
  if (!created) throw new Error("Failed to create vehicle catalog family.");
  return { created: true, id: created.id };
}

async function deactivateEmptyFamilies(
  db: ReturnType<typeof drizzle<typeof productSchema>>,
): Promise<number> {
  const families = await db
    .select({ id: vehicleCatalogModelFamilies.id })
    .from(vehicleCatalogModelFamilies)
    .where(eq(vehicleCatalogModelFamilies.isActive, true));
  const versions = await db
    .select({ familyId: vehicleCatalogVersions.modelFamilyId })
    .from(vehicleCatalogVersions)
    .where(eq(vehicleCatalogVersions.isActive, true));
  const used = new Set(versions.map((version) => version.familyId));
  const emptyFamilies = families.filter((family) => !used.has(family.id));

  for (const family of emptyFamilies) {
    await db
      .update(vehicleCatalogModelFamilies)
      .set({ isActive: false })
      .where(eq(vehicleCatalogModelFamilies.id, family.id));
  }
  return emptyFamilies.length;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} must be configured for catalog normalization.`);
  }
  return value;
}

void main();
