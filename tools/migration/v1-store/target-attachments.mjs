import { legacyMetadata, targetId } from "./common.mjs";
import { addLegacyMap } from "./target-foundation.mjs";

export async function seedFinanceAttachments(tx, data, config, ids) {
  for (const entry of data.entries) {
    if (!entry.attachmentUrl && !entry.attachmentR2Key) continue;
    const documentId = targetId(
      config.legacyStoreId,
      "Entry:attachment",
      entry.id,
    );
    const available = Boolean(entry.attachmentR2Key && entry.attachmentUrl);
    const storageKey =
      entry.attachmentR2Key || `legacy-unavailable/v1/Entry/${entry.id}`;
    await tx`INSERT INTO documents
      (id, file_name, file_size_bytes, kind, metadata, mime_type, status, storage_key, store_id, tenant_id, title, uploaded_at, created_at, updated_at)
      VALUES (${documentId}, ${entry.attachmentFileName || `entry-${entry.id}`}, ${entry.attachmentSizeBytes || null}, 'invoice',
        ${tx.json(legacyMetadata("Entry.attachment", entry, { artifactAvailable: available, legacyPublicUrl: entry.attachmentUrl || null }))},
        ${entry.attachmentContentType || null}, ${available ? "issued" : "archived"}, ${storageKey}, ${ids.store}, ${ids.tenant},
        ${entry.attachmentFileName || entry.name}, ${entry.attachmentUploadedAt || entry.createdAt}, ${entry.createdAt}, ${entry.updatedAt})
      ON CONFLICT (id) DO UPDATE SET metadata=excluded.metadata, status=excluded.status, updated_at=excluded.updated_at`;
    await tx`INSERT INTO document_links
      (id, document_id, link_role, store_id, target_id, target_type, tenant_id, created_at, updated_at)
      VALUES (${targetId(config.legacyStoreId, "EntryAttachmentLink", entry.id)}, ${documentId}, 'attachment', ${ids.store},
        ${ids.entries.get(entry.id)}, 'finance_entry', ${ids.tenant}, ${entry.createdAt}, ${entry.updatedAt})
      ON CONFLICT (id) DO NOTHING`;
    await addLegacyMap(
      tx,
      ids.run,
      "Entry:attachment",
      entry.id,
      "documents",
      documentId,
    );
  }
}
