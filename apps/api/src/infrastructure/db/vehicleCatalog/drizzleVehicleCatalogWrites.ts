import {
  vehicleCatalogBrands,
  vehicleCatalogModelFamilies,
  vehicleCatalogPriceHistory,
  vehicleCatalogReferences,
  vehicleCatalogVersions,
  vehicleCatalogYears,
} from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import type { VehicleCatalogRepository } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import type { DrizzleVehicleCatalogClient } from "./drizzleVehicleCatalogRepository.js";
import {
  findBrand,
  findVersion,
  findVersionByBrandId,
  findYear,
  requireRow,
  seen,
  slugify,
} from "./drizzleVehicleCatalogSupport.js";

type CatalogWrites = Pick<
  VehicleCatalogRepository,
  | "upsertBrand"
  | "upsertModelFamily"
  | "upsertPriceHistory"
  | "upsertReferences"
  | "upsertSnapshotDetails"
  | "upsertVersion"
  | "upsertYear"
>;

export function createDrizzleVehicleCatalogWrites(
  db: DrizzleVehicleCatalogClient,
): CatalogWrites {
  return {
    async upsertBrand(input) {
      const existing = await findBrand(db, {
        brandCode: input.code,
        vehicleType: input.vehicleType,
      });
      const values = seen({
        isActive: true,
        logoUrl: input.imageUrl ?? null,
        name: input.name,
        slug: slugify(input.name),
      });
      const [row] = existing
        ? await db
            .update(vehicleCatalogBrands)
            .set(values)
            .where(eq(vehicleCatalogBrands.id, existing.id))
            .returning()
        : await db
            .insert(vehicleCatalogBrands)
            .values({
              ...values,
              fipeCode: input.code,
              vehicleType: input.vehicleType,
            })
            .returning();
      return { id: requireRow(row).id };
    },
    async upsertModelFamily(input) {
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
      const values = seen({
        brandId: input.brandId,
        isActive: true,
        name: input.name,
        slug,
        vehicleType: input.vehicleType,
      });
      const [row] = existing
        ? await db
            .update(vehicleCatalogModelFamilies)
            .set(values)
            .where(eq(vehicleCatalogModelFamilies.id, existing.id))
            .returning()
        : await db
            .insert(vehicleCatalogModelFamilies)
            .values(values)
            .returning();
      const saved = requireRow(row);
      return { code: saved.slug, id: saved.id, name: saved.name };
    },
    async upsertSnapshotDetails(input) {
      const version = await findVersion(db, {
        brandCode: input.brandCode,
        vehicleType: input.vehicleType,
        versionCode: input.modelCode,
      });
      if (!version) return;
      await db
        .update(vehicleCatalogYears)
        .set({
          fipeCode: input.fipeCode,
          fuel: input.fuel,
          modelYear: input.modelYear,
          priceCents: input.priceCents,
          referenceMonth: input.referenceMonth,
        })
        .where(
          and(
            eq(vehicleCatalogYears.versionId, version.id),
            eq(vehicleCatalogYears.fipeYearCode, input.yearCode),
          ),
        );
    },
    async upsertVersion(input) {
      const existing = await findVersionByBrandId(
        db,
        input.brandId,
        input.code,
      );
      const values = seen({
        brandId: input.brandId,
        fipeCode: input.code,
        isActive: true,
        modelFamilyId: input.modelFamilyId,
        name: input.name,
        providerName: input.providerName ?? input.name,
        slug: slugify(input.name),
        vehicleType: input.vehicleType,
      });
      const [row] = existing
        ? await db
            .update(vehicleCatalogVersions)
            .set(values)
            .where(eq(vehicleCatalogVersions.id, existing.id))
            .returning()
        : await db.insert(vehicleCatalogVersions).values(values).returning();
      return { id: requireRow(row).id };
    },
    async upsertYear(input) {
      const existing = await findYear(db, input.versionId, input.code);
      const values = seen({
        fipeYearCode: input.code,
        fuelCode: input.fuelCode,
        isActive: true,
        modelYear: input.modelYear,
        name: input.name,
        versionId: input.versionId,
      });
      if (!existing) await db.insert(vehicleCatalogYears).values(values);
      else {
        await db
          .update(vehicleCatalogYears)
          .set(values)
          .where(eq(vehicleCatalogYears.id, existing.id));
      }
    },
    async upsertReferences(input) {
      const now = new Date();
      await db
        .update(vehicleCatalogReferences)
        .set({ isLatest: false })
        .where(eq(vehicleCatalogReferences.provider, "fipe"));

      for (const reference of input) {
        const [existing] = await db
          .select()
          .from(vehicleCatalogReferences)
          .where(
            and(
              eq(vehicleCatalogReferences.provider, "fipe"),
              eq(vehicleCatalogReferences.code, reference.code),
            ),
          );
        const values = {
          isLatest: reference.isLatest,
          lastSeenAt: now,
          month: reference.month,
          rawPayload: reference.rawPayload ?? reference,
        };
        if (existing) {
          await db
            .update(vehicleCatalogReferences)
            .set(values)
            .where(eq(vehicleCatalogReferences.id, existing.id));
        } else {
          await db.insert(vehicleCatalogReferences).values({
            ...values,
            code: reference.code,
            provider: "fipe",
          });
        }
      }
    },
    async upsertPriceHistory(input) {
      const now = new Date();
      for (const entry of input.entries) {
        const [existing] = await db
          .select()
          .from(vehicleCatalogPriceHistory)
          .where(
            and(
              eq(vehicleCatalogPriceHistory.provider, "fipe"),
              eq(vehicleCatalogPriceHistory.vehicleType, input.vehicleType),
              eq(vehicleCatalogPriceHistory.fipeCode, input.fipeCode),
              eq(vehicleCatalogPriceHistory.fipeYearCode, input.yearCode),
              eq(vehicleCatalogPriceHistory.referenceCode, entry.referenceCode),
            ),
          );
        const values = {
          lastSeenAt: now,
          priceCents: entry.priceCents,
          priceLabel: entry.priceLabel,
          rawPayload: entry.rawPayload ?? entry,
          referenceMonth: entry.referenceMonth,
        };
        if (existing) {
          await db
            .update(vehicleCatalogPriceHistory)
            .set(values)
            .where(eq(vehicleCatalogPriceHistory.id, existing.id));
        } else {
          await db.insert(vehicleCatalogPriceHistory).values({
            ...values,
            fipeCode: input.fipeCode,
            fipeYearCode: input.yearCode,
            provider: "fipe",
            referenceCode: entry.referenceCode,
            vehicleType: input.vehicleType,
          });
        }
      }
    },
  };
}
