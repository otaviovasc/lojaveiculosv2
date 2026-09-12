export async function upsertCrmUiDemoEntities(tx, fixtures, scope, now) {
  const connection = withScope(
    {
      id: fixtures.connection.id,
      broker: fixtures.connection.broker,
      channel: fixtures.connection.channel,
      display_name: fixtures.connection.displayName,
      metadata: fixtures.connection.metadata,
      provider: fixtures.connection.provider,
      state: fixtures.connection.state,
      created_at: now,
    },
    scope,
    now,
  );
  await tx`INSERT INTO crm_channel_connections ${tx(connection)}
    ON CONFLICT (id) DO UPDATE SET
      broker=EXCLUDED.broker, channel=EXCLUDED.channel,
      display_name=EXCLUDED.display_name, metadata=EXCLUDED.metadata,
      provider=EXCLUDED.provider, state=EXCLUDED.state,
      store_id=EXCLUDED.store_id, tenant_id=EXCLUDED.tenant_id,
      updated_at=EXCLUDED.updated_at`;

  const contacts = fixtures.contacts.map((row) =>
    withScope(
      {
        id: row.id,
        display_name: row.displayName,
        primary_email: row.primaryEmail,
        primary_phone: row.primaryPhone,
        metadata: row.metadata,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO contacts ${tx(contacts)}
    ON CONFLICT (id) DO UPDATE SET
      deleted_at=NULL, display_name=EXCLUDED.display_name,
      is_deleted=false, primary_email=EXCLUDED.primary_email,
      primary_phone=EXCLUDED.primary_phone, metadata=EXCLUDED.metadata,
      store_id=EXCLUDED.store_id, tenant_id=EXCLUDED.tenant_id,
      created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`;

  const leads = fixtures.leads.map((row) =>
    withScope(
      {
        id: row.id,
        assigned_user_id: row.assignedUserId,
        buyer_email: row.buyerEmail,
        buyer_name: row.buyerName,
        buyer_phone: row.buyerPhone,
        last_interaction_at: row.lastInteractionAt,
        metadata: row.metadata,
        pipeline_id: row.pipelineId,
        pipeline_stage_id: row.pipelineStageId,
        source: row.source,
        status: row.status,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO leads ${tx(leads)}
    ON CONFLICT (id) DO UPDATE SET
      assigned_user_id=EXCLUDED.assigned_user_id,
      buyer_email=EXCLUDED.buyer_email, buyer_name=EXCLUDED.buyer_name,
      buyer_phone=EXCLUDED.buyer_phone, deleted_at=NULL, is_deleted=false,
      last_interaction_at=EXCLUDED.last_interaction_at,
      metadata=EXCLUDED.metadata, pipeline_id=EXCLUDED.pipeline_id,
      pipeline_stage_id=EXCLUDED.pipeline_stage_id, source=EXCLUDED.source,
      status=EXCLUDED.status, store_id=EXCLUDED.store_id,
      tenant_id=EXCLUDED.tenant_id, created_at=EXCLUDED.created_at,
      updated_at=EXCLUDED.updated_at`;

  const opportunities = fixtures.opportunities.map((row) =>
    withScope(
      {
        id: row.id,
        assigned_user_id: row.assignedUserId,
        contact_id: row.contactId,
        last_interaction_at: row.lastInteractionAt,
        legacy_lead_id: row.legacyLeadId,
        metadata: row.metadata,
        source: row.source,
        stage_key: row.stageKey,
        state: row.state,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO opportunities ${tx(opportunities)}
    ON CONFLICT (id) DO UPDATE SET
      assigned_user_id=EXCLUDED.assigned_user_id,
      contact_id=EXCLUDED.contact_id, deleted_at=NULL, is_deleted=false,
      last_interaction_at=EXCLUDED.last_interaction_at,
      legacy_lead_id=EXCLUDED.legacy_lead_id, metadata=EXCLUDED.metadata,
      source=EXCLUDED.source, stage_key=EXCLUDED.stage_key,
      state=EXCLUDED.state, store_id=EXCLUDED.store_id,
      tenant_id=EXCLUDED.tenant_id, created_at=EXCLUDED.created_at,
      updated_at=EXCLUDED.updated_at`;

  const threads = fixtures.threads.map((row) =>
    withScope(
      {
        id: row.id,
        channel: row.channel,
        channel_metadata: row.channelMetadata,
        contact_id: row.contactId,
        customer_chat_id: row.customerChatId,
        customer_display_name: row.customerDisplayName,
        customer_phone: row.customerPhone,
        external_thread_id: row.externalThreadId,
        last_message_at: row.lastMessageAt,
        metadata: row.metadata,
        profile_photo_url: row.profilePhotoUrl,
        provider_connection_id: row.providerConnectionId,
        source: row.source,
        state: row.state,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO crm_conversation_threads ${tx(threads)}
    ON CONFLICT (id) DO UPDATE SET
      channel=EXCLUDED.channel, channel_metadata=EXCLUDED.channel_metadata,
      contact_id=EXCLUDED.contact_id, customer_chat_id=EXCLUDED.customer_chat_id,
      customer_display_name=EXCLUDED.customer_display_name,
      customer_phone=EXCLUDED.customer_phone,
      external_thread_id=EXCLUDED.external_thread_id,
      last_message_at=EXCLUDED.last_message_at, metadata=EXCLUDED.metadata,
      profile_photo_url=EXCLUDED.profile_photo_url,
      provider_connection_id=EXCLUDED.provider_connection_id,
      source=EXCLUDED.source, state=EXCLUDED.state,
      store_id=EXCLUDED.store_id, tenant_id=EXCLUDED.tenant_id,
      created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`;
}

function withScope(row, scope, now) {
  return {
    ...row,
    store_id: scope.storeId,
    tenant_id: scope.tenantId,
    updated_at: now,
  };
}
