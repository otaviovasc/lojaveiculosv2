import { mapRepassesConnection } from "./crm-whatsapp-mapping.mjs";
import { nullableString, targetId } from "./common.mjs";
import { createCrmCredentialSealer } from "./crm-credential-sealer.mjs";

export async function seedWhatsappConnections(tx, source, config, ids) {
  const seal = createCrmCredentialSealer();
  for (const connection of source.connections) {
    const mapped = mapRepassesConnection(connection, {
      activate: config.activateWhatsappConnections,
      sealCredential: (input) =>
        seal({ ...input, storeId: ids.store, tenantId: ids.tenant }),
    });
    const displayName = nullableString(
      connection.name ||
        connection.instance_name ||
        `WhatsApp ${connection.id}`,
      160,
    );
    const id = await resolveConnectionId(
      tx,
      connection,
      mapped,
      displayName,
      source.connections.length,
      config,
      ids,
    );
    ids.crmChannelConnections.set(connection.id, id);
    await tx`INSERT INTO crm_channel_connections
      (id, broker, channel, display_name, external_connection_id,
       external_instance_id, metadata, provider, state, store_id,
       tenant_id, webhook_url, created_at, updated_at)
      VALUES (${id}, 'direct', 'whatsapp', ${displayName},
        ${connection.uuid}, ${mapped.externalInstanceId},
        ${tx.json({
          capabilities: {
            inbound: true,
            outbound: true,
            scheduling: true,
            templates: false,
          },
          connected: mapped.status === "active",
          credentialsRef: mapped.credentialsRef,
          legacyRepasses: {
            catalogSyncEnabled: connection.catalog_sync_enabled,
            mode: connection.mode,
            sourceId: String(connection.id),
            sourceTable: "connections",
            sourceUuid: connection.uuid,
          },
          migration: {
            importedConnectionState: mapped.status,
            mediaStrategy: "keep_legacy_urls",
          },
          phone: nullableString(
            connection.connection_phone_number ?? connection.phone,
            40,
          ),
        })},
        ${mapped.provider}, ${mapped.status}, ${ids.store}, ${ids.tenant}, null,
        ${connection.created_at}, ${connection.updated_at})
      ON CONFLICT (id) DO UPDATE SET
        display_name=excluded.display_name,
        external_connection_id=excluded.external_connection_id,
        external_instance_id=excluded.external_instance_id,
        metadata=excluded.metadata,
        state=excluded.state,
        updated_at=excluded.updated_at`;
  }
}

async function resolveConnectionId(
  tx,
  connection,
  mapped,
  displayName,
  sourceConnectionCount,
  config,
  ids,
) {
  const externalId = String(connection.uuid);
  const [globalExternal] = await tx.unsafe(
    `SELECT id, store_id
       FROM crm_channel_connections
      WHERE provider=$1 AND external_connection_id=$2
      LIMIT 1`,
    [mapped.provider, externalId],
  );
  if (globalExternal && globalExternal.store_id !== ids.store)
    throw new Error(
      `Repasses connection ${connection.id} is already attached to another V2 store.`,
    );

  const matches = await tx.unsafe(
    `SELECT id
       FROM crm_channel_connections
      WHERE store_id=$1 AND provider=$2
        AND (external_instance_id=$3 OR display_name=$4)
      ORDER BY id`,
    [ids.store, mapped.provider, mapped.lookupInstanceId ?? "", displayName],
  );
  const candidateIds = new Set([
    ...(globalExternal ? [globalExternal.id] : []),
    ...matches.map((match) => match.id),
  ]);
  if (candidateIds.size > 1)
    throw new Error(
      `Multiple V2 connections match Repasses connection ${connection.id}; resolve the target duplicates before migration.`,
    );
  if (candidateIds.size === 1) return [...candidateIds][0];

  if (sourceConnectionCount === 1) {
    const existing = await tx.unsafe(
      `SELECT id FROM crm_channel_connections
        WHERE store_id=$1 AND provider=$2
        ORDER BY id
        LIMIT 2`,
      [ids.store, mapped.provider],
    );
    if (existing.length === 1) return existing[0].id;
  }
  return targetId(config.legacyStoreId, "RepassesConnection", connection.id);
}
