import {
  buildLeadCrmSessionIndex,
  buildLeadPhoneIndex,
  mapRepassesSessionStatus,
  resolveLegacyLeadLink,
} from "./crm-whatsapp-mapping.mjs";
import { json, nullableString } from "./common.mjs";

export async function assertWhatsappLeadCoverage(tx, data, groups, ids) {
  const existingLeadIds = new Set(
    (await tx`SELECT id FROM leads WHERE store_id=${ids.store}`).map(
      (lead) => lead.id,
    ),
  );
  const crmSessionIndex = buildLeadCrmSessionIndex(data.leads);
  const phoneIndex = buildLeadPhoneIndex(data.leads);
  const knownLegacyIds = new Set(data.leads.map((lead) => lead.id));
  const missingLegacyIds = new Set();

  for (const group of groups) {
    const link = resolveLegacyLeadLink(
      group,
      crmSessionIndex,
      phoneIndex,
      knownLegacyIds,
    );
    if (!link.leadId) continue;
    const targetLeadId = ids.leads.get(link.leadId);
    if (!targetLeadId || !existingLeadIds.has(targetLeadId))
      missingLegacyIds.add(link.leadId);
  }

  if (missingLegacyIds.size)
    throw new Error(
      `${missingLegacyIds.size} V1 lead(s) linked to WhatsApp are missing in V2. ` +
        "Include the leads module in this run or migrate leads before WhatsApp.",
    );
}

export function conversationRows(
  tx,
  group,
  idsForConversation,
  leadId,
  assignedUserId,
  messageCounts,
  ids,
) {
  const row = group.canonical;
  const messageCount = group.members.reduce(
    (total, member) => total + (messageCounts.get(member.id) ?? 0),
    0,
  );
  const sessionStatus = mapRepassesSessionStatus(row);
  const createdAt = oldest(group.members, "created_at");
  const updatedAt = newest(group.members, "updated_at") ?? createdAt;
  const providerConnectionId = ids.crmChannelConnections.get(row.connection_id);
  if (!providerConnectionId)
    throw new Error(
      `Missing WhatsApp connection mapping for Repasses session ${row.id}.`,
    );
  const attendance = attendanceRow(
    row,
    idsForConversation,
    assignedUserId,
    createdAt,
    updatedAt,
    ids,
  );
  const thread = {
    channel: "whatsapp",
    channel_metadata: tx.json({
      legacyRepasses: {
        originalChannel: row.original_channel ?? null,
        sessionChannel: row.channel ?? "WHATSAPP",
      },
    }),
    created_at: createdAt,
    customer_chat_id: nullableString(row.buyer_chat_lid, 191),
    customer_display_name: nullableString(row.buyer_name, 191),
    customer_phone: /^\d+$/.test(group.buyerPhone)
      ? nullableString(group.buyerPhone, 40)
      : null,
    external_thread_id: nullableString(row.channel_external_id, 191),
    id: idsForConversation.threadId,
    last_message_at: newest(group.members, "last_message_at"),
    metadata: tx.json({ unreadCount: 0 }),
    profile_photo_url: nullableString(row.profile_photo_url),
    provider_connection_id: providerConnectionId,
    source: nullableString(row.source, 80),
    state: threadState(sessionStatus),
    store_id: ids.store,
    tenant_id: ids.tenant,
    updated_at: updatedAt,
  };
  const cycle = {
    assigned_user_id: assignedUserId,
    created_at: createdAt,
    external_cycle_id: row.uuid,
    first_handled_at: row.first_handled_at,
    fresh_lead_at: row.fresh_lead_at,
    id: idsForConversation.cycleId,
    last_customer_read_at: row.last_customer_read_at,
    last_message_at: newest(group.members, "last_message_at"),
    last_message_content: row.last_message_content,
    last_read_at: row.last_read_at,
    message_count: messageCount,
    metadata: tx.json({
      leadId,
      legacyRepasses: {
        conversationStep: row.conversation_step,
        deletedAt: row.deleted_at ?? null,
        disposition: row.disposition,
        mergedSourceIds: group.members.map((member) => String(member.id)),
        sourceId: String(row.id),
        sourceTable: "chat_sessions",
        sourceUuid: row.uuid,
        status: row.status,
      },
      sessionMetadata: {},
      sessionStatus:
        sessionStatus === "MINIBOT_ACTIVE" ? "MINIBOT_ACTIVE" : "ACTIVE",
    }),
    state: cycleState(sessionStatus),
    store_id: ids.store,
    tenant_id: ids.tenant,
    thread_id: idsForConversation.threadId,
    updated_at: updatedAt,
  };
  return { attendance, cycle, thread };
}

function attendanceRow(
  row,
  conversationIds,
  assignedUserId,
  createdAt,
  updatedAt,
  ids,
) {
  const sessionStatus = mapRepassesSessionStatus(row);
  const humanActive = sessionStatus === "HUMAN_TAKEOVER";
  const state = humanActive
    ? assignedUserId
      ? "human_active"
      : "handoff_requested"
    : "bot_active";
  const handoffAt = humanActive
    ? (row.human_takeover_at ?? updatedAt ?? createdAt)
    : null;
  return {
    assigned_at: assignedUserId
      ? (row.last_assigned_at ?? handoffAt ?? createdAt)
      : null,
    assigned_user_id: assignedUserId,
    changed_at: updatedAt,
    created_at: createdAt,
    cycle_id: conversationIds.cycleId,
    handling_started_at:
      state === "human_active"
        ? (row.first_handled_at ?? handoffAt ?? createdAt)
        : null,
    handoff_requested_at: handoffAt,
    history_started_at: createdAt,
    id: conversationIds.attendanceId,
    state,
    state_version: 0,
    store_id: ids.store,
    tenant_id: ids.tenant,
    thread_id: conversationIds.threadId,
    updated_at: updatedAt,
  };
}

function cycleState(status) {
  if (status === "COMPLETED") return "completed";
  if (status === "EXPIRED") return "expired";
  return "active";
}

function threadState(status) {
  if (status === "COMPLETED") return "resolved";
  if (status === "EXPIRED") return "archived";
  return "open";
}

export function buildAgentUserMap(agents, data, ids, accessEmails = new Map()) {
  const byEmail = new Map();
  for (const access of data.accesses) {
    const email = nullableString(
      json(access.profile).email ?? accessEmails.get(access.id),
      254,
    )?.toLowerCase();
    const userId = ids.users.get(access.clerkUserId);
    if (email && userId) byEmail.set(email, userId);
  }
  return new Map(
    agents.map((agent) => [
      agent.id,
      ids.users.get(agent.clerk_user_id) ??
        byEmail.get(
          String(agent.email ?? "")
            .trim()
            .toLowerCase(),
        ) ??
        null,
    ]),
  );
}

export function findAssignedUserId(group, userIdsByAgent) {
  for (const member of [group.canonical, ...group.members])
    if (userIdsByAgent.get(member.assigned_agent_id))
      return userIdsByAgent.get(member.assigned_agent_id);
  return null;
}

export function countMessagesBySession(messages) {
  const counts = new Map();
  for (const message of messages)
    counts.set(
      message.chat_session_id,
      (counts.get(message.chat_session_id) ?? 0) + 1,
    );
  return counts;
}

function oldest(rows, field) {
  return rows
    .map((row) => row[field])
    .filter(Boolean)
    .sort()[0];
}

function newest(rows, field) {
  return rows
    .map((row) => row[field])
    .filter(Boolean)
    .sort()
    .at(-1);
}
