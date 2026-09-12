export async function upsertCrmUiDemoConversations(tx, fixtures, scope, now) {
  const cycles = fixtures.cycles.map((row) =>
    withScope(
      {
        id: row.id,
        assigned_user_id: row.assignedUserId,
        closed_at: row.closedAt,
        first_handled_at: row.firstHandledAt,
        fresh_lead_at: row.freshLeadAt,
        last_customer_read_at: row.lastCustomerReadAt,
        last_message_at: row.lastMessageAt,
        last_message_content: row.lastMessageContent,
        last_read_at: row.lastReadAt,
        message_count: row.messageCount,
        metadata: row.metadata,
        opportunity_id: row.opportunityId,
        state: row.state,
        thread_id: row.threadId,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO crm_conversation_cycles ${tx(cycles)}
    ON CONFLICT (id) DO UPDATE SET
      assigned_user_id=EXCLUDED.assigned_user_id,
      closed_at=EXCLUDED.closed_at, first_handled_at=EXCLUDED.first_handled_at,
      fresh_lead_at=EXCLUDED.fresh_lead_at,
      last_customer_read_at=EXCLUDED.last_customer_read_at,
      last_message_at=EXCLUDED.last_message_at,
      last_message_content=EXCLUDED.last_message_content,
      last_read_at=EXCLUDED.last_read_at, message_count=EXCLUDED.message_count,
      metadata=EXCLUDED.metadata, opportunity_id=EXCLUDED.opportunity_id,
      state=EXCLUDED.state, thread_id=EXCLUDED.thread_id,
      store_id=EXCLUDED.store_id, tenant_id=EXCLUDED.tenant_id,
      created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`;

  const attendances = fixtures.attendances.map((row) =>
    withScope(
      {
        id: row.id,
        assigned_at: row.assignedAt,
        assigned_user_id: row.assignedUserId,
        changed_at: row.changedAt,
        cycle_id: row.cycleId,
        handling_started_at: row.handlingStartedAt,
        history_started_at: row.historyStartedAt,
        state: row.state,
        state_version: row.stateVersion,
        thread_id: row.threadId,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO crm_conversation_attendances ${tx(attendances)}
    ON CONFLICT (id) DO UPDATE SET
      assigned_at=EXCLUDED.assigned_at,
      assigned_user_id=EXCLUDED.assigned_user_id,
      changed_at=EXCLUDED.changed_at, cycle_id=EXCLUDED.cycle_id,
      handback_requested_at=NULL, handoff_requested_at=NULL,
      handling_started_at=EXCLUDED.handling_started_at,
      history_started_at=EXCLUDED.history_started_at, intervention_id=NULL,
      state=EXCLUDED.state, state_version=EXCLUDED.state_version,
      thread_id=EXCLUDED.thread_id, store_id=EXCLUDED.store_id,
      tenant_id=EXCLUDED.tenant_id, created_at=EXCLUDED.created_at,
      updated_at=EXCLUDED.updated_at`;

  const messages = fixtures.messages.map((row) =>
    withScope(
      {
        id: row.id,
        content: row.content,
        cycle_id: row.cycleId,
        direction: row.direction,
        media_type: row.mediaType,
        media_url: row.mediaUrl,
        message_type: row.messageType,
        metadata: row.metadata,
        occurred_at: row.occurredAt,
        provider: row.provider,
        provider_connection_id: row.providerConnectionId,
        sender: row.sender,
        sender_origin: row.senderOrigin,
        status: row.status,
        thread_id: row.threadId,
        created_at: row.createdAt,
      },
      scope,
      now,
    ),
  );
  await tx`INSERT INTO crm_messages ${tx(messages)}
    ON CONFLICT (id) DO UPDATE SET
      content=EXCLUDED.content, cycle_id=EXCLUDED.cycle_id,
      deleted_at=NULL, direction=EXCLUDED.direction,
      media_type=EXCLUDED.media_type, media_url=EXCLUDED.media_url,
      message_type=EXCLUDED.message_type, metadata=EXCLUDED.metadata,
      occurred_at=EXCLUDED.occurred_at, provider=EXCLUDED.provider,
      provider_connection_id=EXCLUDED.provider_connection_id,
      provider_message_id=NULL, sender=EXCLUDED.sender,
      sender_origin=EXCLUDED.sender_origin, status=EXCLUDED.status,
      thread_id=EXCLUDED.thread_id, store_id=EXCLUDED.store_id,
      tenant_id=EXCLUDED.tenant_id, created_at=EXCLUDED.created_at,
      updated_at=EXCLUDED.updated_at`;
}

function withScope(row, scope, now) {
  return {
    ...row,
    store_id: scope.storeId,
    tenant_id: scope.tenantId,
    updated_at: now,
  };
}
