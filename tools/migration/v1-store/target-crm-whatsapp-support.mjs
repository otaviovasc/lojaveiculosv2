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

export function sessionRow(
  tx,
  group,
  id,
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
  return {
    assigned_user_id: assignedUserId,
    buyer_chat_lid: nullableString(row.buyer_chat_lid, 191),
    buyer_name: nullableString(row.buyer_name, 191),
    buyer_phone: group.buyerPhone,
    channel: row.channel ?? "WHATSAPP",
    channel_external_id: nullableString(row.channel_external_id, 191),
    channel_metadata: tx.json({
      legacyRepasses: { originalChannel: row.original_channel ?? null },
    }),
    connection_id: ids.crmConnections.get(row.connection_id),
    created_at: oldest(group.members, "created_at"),
    external_session_id: row.uuid,
    first_handled_at: row.first_handled_at,
    fresh_lead_at: row.fresh_lead_at,
    human_takeover_at: row.human_takeover_at,
    id,
    last_assigned_at: row.last_assigned_at,
    last_customer_read_at: row.last_customer_read_at,
    last_message_at: newest(group.members, "last_message_at"),
    last_message_content: row.last_message_content,
    last_read_at: row.last_read_at,
    lead_id: leadId,
    message_count: messageCount,
    metadata: tx.json({
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
    }),
    profile_photo_url: nullableString(row.profile_photo_url),
    source: nullableString(row.source, 80),
    status: mapRepassesSessionStatus(row),
    store_id: ids.store,
    tenant_id: ids.tenant,
    updated_at: newest(group.members, "updated_at"),
  };
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
