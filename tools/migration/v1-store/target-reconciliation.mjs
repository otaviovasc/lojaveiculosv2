import { targetId } from "./common.mjs";
import { log } from "./log.mjs";

const REMOVED_MARKER =
  "jsonb_build_object('removedFromSource', true, 'reconciledAt', now())";

export async function reconcileLegacyProjection(
  tx,
  data,
  config,
  ids,
  modules,
) {
  log(
    "  Reconciliation: comparing the committed V1 projection to this dump...",
  );
  const counts = {};

  if (modules.has("vehicles")) {
    const listingIds = data.vehicles.map((row) =>
      targetId(config.legacyStoreId, "Veiculo:listing", row.id),
    );
    counts.vehicleMedia = await reconcileSoftDeletedRows(
      tx,
      "vehicle_media",
      "metadata->'legacyV1'->>'sourceTable'='FotosVeiculo'",
      ids.store,
      data.photos.map((row) =>
        targetId(config.legacyStoreId, "FotosVeiculo", row.id),
      ),
    );
    counts.vehicleUnits = await reconcileVehicleUnits(
      tx,
      ids.store,
      listingIds,
    );
    counts.vehicleListings = await reconcileSoftDeletedRows(
      tx,
      "vehicle_listings",
      "metadata->'legacyV1'->>'sourceTable'='Veiculo'",
      ids.store,
      listingIds,
    );
  }

  if (modules.has("leads")) {
    counts.leads = await reconcileSoftDeletedRows(
      tx,
      "leads",
      "metadata->'legacyV1'->>'sourceTable'='Lead'",
      ids.store,
      data.leads.map((row) => targetId(config.legacyStoreId, "Lead", row.id)),
    );
  }

  if (modules.has("sales")) {
    counts.sales = await reconcileSoftDeletedRows(
      tx,
      "sales",
      "buyer_snapshot->'legacyV1'->>'sourceTable'='Sale.buyer'",
      ids.store,
      data.sales.map((row) => targetId(config.legacyStoreId, "Sale", row.id)),
    );
    counts.salePayments = await reconcileStatusRows(
      tx,
      "sale_payments",
      "metadata->'legacyV1'->>'sourceTable'='SalePayment'",
      ids.store,
      data.salePayments.map((row) =>
        targetId(config.legacyStoreId, "SalePayment", row.id),
      ),
    );
    counts.financeEntries = await reconcileStatusRows(
      tx,
      "finance_entries",
      "metadata->'legacyV1'->>'sourceTable'='Entry'",
      ids.store,
      data.entries.map((row) =>
        targetId(config.legacyStoreId, "Entry", row.id),
      ),
    );
    counts.recurringEntries = await reconcileStatusRows(
      tx,
      "finance_recurring_entries",
      "metadata->'legacyV1'->>'sourceTable'='RecurringEntry'",
      ids.store,
      data.recurringEntries.map((row) =>
        targetId(config.legacyStoreId, "RecurringEntry", row.id),
      ),
    );
  }

  if (modules.has("documents")) {
    counts.documents = await reconcileSoftDeletedRows(
      tx,
      "documents",
      "metadata->'legacyV1'->>'sourceTable'='Document'",
      ids.store,
      data.documents.map((row) =>
        targetId(config.legacyStoreId, "Document", row.id),
      ),
    );
  }

  if (modules.has("attachments")) {
    const attachments = data.entries.filter(
      (row) => row.attachmentUrl || row.attachmentR2Key,
    );
    counts.attachments = await reconcileSoftDeletedRows(
      tx,
      "documents",
      "metadata->'legacyV1'->>'sourceTable'='Entry.attachment'",
      ids.store,
      attachments.map((row) =>
        targetId(config.legacyStoreId, "Entry:attachment", row.id),
      ),
    );
  }

  const changed = Object.entries(counts).filter(([, count]) => count > 0);
  if (!changed.length) {
    log("  Reconciliation: projection already matches this dump");
    return counts;
  }
  log(
    `  Reconciliation: deactivated ${changed
      .map(([name, count]) => `${count} ${name}`)
      .join(", ")}`,
  );
  return counts;
}

async function reconcileSoftDeletedRows(
  tx,
  table,
  provenance,
  storeId,
  expectedIds,
) {
  const rows = await tx.unsafe(
    `UPDATE ${table}
        SET is_deleted=NOT (id=ANY($2::uuid[])),
            deleted_at=CASE
              WHEN id=ANY($2::uuid[]) THEN NULL
              ELSE COALESCE(deleted_at, now())
            END,
            updated_at=now()
      WHERE store_id=$1
        AND ${provenance}
        AND (
          is_deleted IS DISTINCT FROM NOT (id=ANY($2::uuid[]))
          OR (id=ANY($2::uuid[]) AND deleted_at IS NOT NULL)
          OR (NOT (id=ANY($2::uuid[])) AND deleted_at IS NULL)
        )
      RETURNING id`,
    [storeId, expectedIds],
  );
  return rows.length;
}

async function reconcileVehicleUnits(tx, storeId, expectedListingIds) {
  const rows = await tx.unsafe(
    `UPDATE vehicle_units AS unit
        SET is_deleted=NOT (listing.id=ANY($2::uuid[])),
            deleted_at=CASE
              WHEN listing.id=ANY($2::uuid[]) THEN NULL
              ELSE COALESCE(unit.deleted_at, now())
            END,
            updated_at=now()
       FROM vehicle_listings AS listing
      WHERE unit.store_id=$1
        AND listing.id=unit.listing_id
        AND listing.store_id=$1
        AND listing.metadata->'legacyV1'->>'sourceTable'='Veiculo'
        AND (
          unit.is_deleted IS DISTINCT FROM NOT (listing.id=ANY($2::uuid[]))
          OR (listing.id=ANY($2::uuid[]) AND unit.deleted_at IS NOT NULL)
          OR (NOT (listing.id=ANY($2::uuid[])) AND unit.deleted_at IS NULL)
        )
      RETURNING unit.id`,
    [storeId, expectedListingIds],
  );
  return rows.length;
}

async function reconcileStatusRows(
  tx,
  table,
  provenance,
  storeId,
  expectedIds,
) {
  const rows = await tx.unsafe(
    `UPDATE ${table}
        SET status=CASE
              WHEN id=ANY($2::uuid[]) THEN status
              ELSE 'cancelled'
            END,
            metadata=CASE
              WHEN id=ANY($2::uuid[])
                THEN metadata - 'migrationReconciliation'
              ELSE jsonb_set(
                metadata,
                '{migrationReconciliation}',
                ${REMOVED_MARKER},
                true
              )
            END,
            updated_at=now()
      WHERE store_id=$1
        AND ${provenance}
        AND (
          (id=ANY($2::uuid[])
            AND metadata ? 'migrationReconciliation')
          OR (NOT (id=ANY($2::uuid[]))
            AND (
              status <> 'cancelled'
              OR COALESCE(
                (metadata->'migrationReconciliation'->>'removedFromSource')::boolean,
                false
              ) = false
            ))
        )
      RETURNING id`,
    [storeId, expectedIds],
  );
  return rows.length;
}
