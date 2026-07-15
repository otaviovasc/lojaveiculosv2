import { SEED_MEDIA_PLACEHOLDER_VERSION } from "./seed-product-media-placeholder.mjs";

export async function readSeedDocumentObjectSizes({ db, headObject }) {
  const rows = await db`
    select storage_key as "storageKey" from documents
    where storage_key like 'generated/vehicle-workflows/%'
       or storage_key like 'seed/documents/%'
    union
    select storage_key from document_versions
    where storage_key like 'generated/vehicle-workflows/%'
       or storage_key like 'seed/documents/%'
    order by "storageKey"
  `;
  return Promise.all(
    rows.map(async (row) => {
      const object = await headObject(row.storageKey);
      if (
        !Number.isSafeInteger(object.ContentLength) ||
        object.ContentLength < 1
      ) {
        throw new Error(
          `Seeded document has no valid size: ${row.storageKey}.`,
        );
      }
      return {
        fileSizeBytes: object.ContentLength,
        storageKey: row.storageKey,
      };
    }),
  );
}

export function reconcileSeedMediaPlaceholders({ db, placeholders }) {
  return db.begin(async (transaction) => {
    let updated = 0;
    for (const placeholder of placeholders) {
      const metadata = JSON.stringify({
        artifactSha256: placeholder.sha256,
        artifactVersion: SEED_MEDIA_PLACEHOLDER_VERSION,
        contentType: placeholder.contentType,
        fileName: placeholder.fileName,
        generatedPlaceholder: true,
        originalStorageKey: placeholder.originalStorageKey,
        sizeBytes: placeholder.sizeBytes,
      });
      const vehicleMedia = await transaction`
        update vehicle_media set
          alt_text = ${placeholder.altText},
          metadata = metadata || ${metadata}::jsonb,
          storage_key = ${placeholder.storageKey},
          url = 'https://seed-assets.local.test/' || ${placeholder.storageKey},
          updated_at = now()
        where id = ${placeholder.mediaId}
        returning id
      `;
      const storefrontAssets = await transaction`
        update storefront_media_assets set
          content_type = ${placeholder.contentType},
          file_name = ${placeholder.fileName},
          height = ${placeholder.height},
          metadata = metadata || ${metadata}::jsonb,
          public_url = 'https://seed-assets.local.test/' || ${placeholder.storageKey},
          size_bytes = ${placeholder.sizeBytes},
          storage_key = ${placeholder.storageKey},
          width = ${placeholder.width},
          updated_at = now()
        where storage_key = ${placeholder.originalStorageKey}
        returning id
      `;
      const sites = await transaction`
        update store_public_site_settings set
          hero_image_url = replace(hero_image_url,
            ${placeholder.originalStorageKey}, ${placeholder.storageKey}),
          updated_at = now()
        where hero_image_url like '%' || ${placeholder.originalStorageKey}
        returning id
      `;
      const pages = await transaction`
        update store_custom_pages set
          components = replace(components::text,
            ${placeholder.originalStorageKey}, ${placeholder.storageKey})::jsonb,
          seo = replace(seo::text,
            ${placeholder.originalStorageKey}, ${placeholder.storageKey})::jsonb,
          updated_at = now()
        where components::text like '%' || ${placeholder.originalStorageKey} || '%'
           or seo::text like '%' || ${placeholder.originalStorageKey} || '%'
        returning id
      `;
      updated +=
        vehicleMedia.length +
        storefrontAssets.length +
        sites.length +
        pages.length;
    }
    return updated;
  });
}

export function updateSeedAssetRecords({ db, documentSizes, publicBaseUrl }) {
  return db.begin(async (transaction) => {
    const urlRows = [];
    urlRows.push(
      ...(await transaction`
        update vehicle_media set
          url = ${publicBaseUrl} || '/' || storage_key, updated_at = now()
        where metadata->>'source' = 'r2_seed'
          and url is distinct from ${publicBaseUrl} || '/' || storage_key
        returning id
      `),
      ...(await transaction`
        update store_public_site_settings set
          hero_image_url = regexp_replace(hero_image_url,
            '^https://seed-assets\\.local\\.test', ${publicBaseUrl}),
          updated_at = now()
        where hero_image_url like 'https://seed-assets.local.test/%'
        returning id
      `),
      ...(await transaction`
        update storefront_media_assets set
          public_url = ${publicBaseUrl} || '/' || storage_key,
          updated_at = now()
        where public_url like 'https://seed-assets.local.test/%'
        returning id
      `),
      ...(await transaction`
        update store_custom_pages set
          components = replace(components::text, 'https://seed-assets.local.test',
            ${publicBaseUrl})::jsonb,
          seo = replace(seo::text, 'https://seed-assets.local.test',
            ${publicBaseUrl})::jsonb,
          updated_at = now()
        where components::text like '%https://seed-assets.local.test%'
           or seo::text like '%https://seed-assets.local.test%'
        returning id
      `),
    );

    let documentSizesUpdated = 0;
    for (const row of documentSizes) {
      const documents = await transaction`
        update documents set file_size_bytes = ${row.fileSizeBytes}, updated_at = now()
        where storage_key = ${row.storageKey}
          and file_size_bytes is distinct from ${row.fileSizeBytes}
        returning id
      `;
      const versions = await transaction`
        update document_versions set file_size_bytes = ${row.fileSizeBytes}, updated_at = now()
        where storage_key = ${row.storageKey}
          and file_size_bytes is distinct from ${row.fileSizeBytes}
        returning id
      `;
      documentSizesUpdated += documents.length + versions.length;
    }
    return { documentSizes: documentSizesUpdated, urls: urlRows.length };
  });
}
