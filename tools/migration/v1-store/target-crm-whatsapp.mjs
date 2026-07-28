import {
  buildLeadCrmSessionIndex,
  buildLeadPhoneIndex,
  groupWhatsappSessions,
  normalizeWhatsappPhone,
  resolveLegacyLeadLink,
} from "./crm-whatsapp-mapping.mjs";
import { nullableString, targetId } from "./common.mjs";
import { log, progress } from "./log.mjs";
import { seedWhatsappConnections } from "./target-crm-whatsapp-connections.mjs";
import { replaceStoreWhatsappHistory } from "./target-crm-whatsapp-replace.mjs";
import {
  assertWhatsappLeadCoverage,
  buildAgentUserMap,
  countMessagesBySession,
  findAssignedUserId,
  sessionRow,
} from "./target-crm-whatsapp-support.mjs";
import { seedWhatsappMessages } from "./target-crm-whatsapp-messages.mjs";

const SESSION_BATCH_SIZE = 250;

export async function seedCrmWhatsapp(tx, data, config, ids) {
  const source = data.whatsapp;
  if (!source)
    throw new Error(
      "Repasses CRM data was not loaded for the whatsapp module.",
    );
  log(
    `  CRM WhatsApp: ${source.connections.length} connection(s), ${source.sessions.length} session(s), ${source.messages.length} message(s)...`,
  );

  const groups = groupWhatsappSessions(source.sessions);
  log("  CRM WhatsApp: checking linked V2 lead coverage...");
  await assertWhatsappLeadCoverage(tx, data, groups, ids);
  log("  CRM WhatsApp: linked lead coverage OK");
  if (config.replaceWhatsappHistory)
    await replaceStoreWhatsappHistory(tx, ids.store);
  log("  CRM WhatsApp: importing connections...");
  await seedWhatsappConnections(tx, source, config, ids);
  log("  CRM WhatsApp: connections imported");
  const sessionIds = await seedSessions(tx, data, source, groups, config, ids);
  await seedWhatsappMessages(
    tx,
    source,
    {
      crmConnectionIds: ids.crmConnections,
      legacyStoreId: config.legacyStoreId,
      storeId: ids.store,
      tenantId: ids.tenant,
    },
    sessionIds,
  );
  log("  CRM WhatsApp done");
}

export function countTargetWhatsappSessions(source) {
  return groupWhatsappSessions(source.sessions).length;
}

async function seedSessions(tx, data, source, groups, config, ids) {
  const leadPhoneIndex = buildLeadPhoneIndex(data.leads);
  const leadCrmSessionIndex = buildLeadCrmSessionIndex(data.leads);
  const knownLeadIds = new Set(data.leads.map((lead) => lead.id));
  const existingLeads = new Set(
    (await tx`SELECT id FROM leads WHERE store_id=${ids.store}`).map(
      (lead) => lead.id,
    ),
  );
  const userIdsByAgent = buildAgentUserMap(
    source.agents,
    data,
    ids,
    config.accessEmails,
  );
  const messageCounts = countMessagesBySession(source.messages);
  const sessionIds = new Map();
  let linkedAssignments = 0;
  const leadLinks = {
    crm_session_id: 0,
    generated: 0,
    phone: 0,
    source_lead_id: 0,
  };
  const rows = [];
  for (const group of groups) {
    const canonical = group.canonical;
    const id = targetId(
      config.legacyStoreId,
      "RepassesChatSession",
      canonical.id,
    );
    for (const member of group.members) sessionIds.set(member.id, id);
    const link = resolveLegacyLeadLink(
      group,
      leadCrmSessionIndex,
      leadPhoneIndex,
      knownLeadIds,
    );
    const candidateLeadId = link.leadId ? ids.leads.get(link.leadId) : null;
    let leadId =
      candidateLeadId && existingLeads.has(candidateLeadId)
        ? candidateLeadId
        : null;
    const assignedUserId = findAssignedUserId(group, userIdsByAgent);
    if (assignedUserId) linkedAssignments += 1;
    if (leadId) {
      leadLinks[link.strategy] += 1;
    } else if (!link.leadId) {
      leadId = await seedWhatsappOnlyLead(
        tx,
        group,
        assignedUserId,
        config,
        ids,
      );
      leadLinks.generated += 1;
      existingLeads.add(leadId);
    } else {
      throw new Error(
        `V2 lead for V1 Lead ${link.leadId} is missing. Include the leads module or migrate leads before WhatsApp.`,
      );
    }
    rows.push(
      sessionRow(tx, group, id, leadId, assignedUserId, messageCounts, ids),
    );
    if (rows.length % 25 === 0 || rows.length === groups.length)
      progress("  CRM WhatsApp session planning", rows.length, groups.length);
  }
  source.generatedLeadCount = leadLinks.generated;

  for (let offset = 0; offset < rows.length; offset += SESSION_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + SESSION_BATCH_SIZE);
    await tx`INSERT INTO crm_whatsapp_sessions ${tx(
      batch,
      "id",
      "assigned_user_id",
      "buyer_chat_lid",
      "buyer_name",
      "buyer_phone",
      "channel",
      "channel_external_id",
      "channel_metadata",
      "connection_id",
      "external_session_id",
      "first_handled_at",
      "fresh_lead_at",
      "human_takeover_at",
      "last_assigned_at",
      "last_customer_read_at",
      "last_message_at",
      "last_message_content",
      "last_read_at",
      "lead_id",
      "message_count",
      "metadata",
      "profile_photo_url",
      "source",
      "status",
      "store_id",
      "tenant_id",
      "created_at",
      "updated_at",
    )}
      ON CONFLICT (id) DO UPDATE SET
        assigned_user_id=excluded.assigned_user_id,
        buyer_chat_lid=excluded.buyer_chat_lid,
        buyer_name=excluded.buyer_name,
        buyer_phone=excluded.buyer_phone,
        channel=excluded.channel,
        channel_external_id=excluded.channel_external_id,
        channel_metadata=excluded.channel_metadata,
        external_session_id=excluded.external_session_id,
        first_handled_at=excluded.first_handled_at,
        fresh_lead_at=excluded.fresh_lead_at,
        human_takeover_at=excluded.human_takeover_at,
        last_assigned_at=excluded.last_assigned_at,
        last_customer_read_at=excluded.last_customer_read_at,
        last_message_at=excluded.last_message_at,
        last_message_content=excluded.last_message_content,
        last_read_at=excluded.last_read_at,
        lead_id=excluded.lead_id,
        message_count=excluded.message_count,
        metadata=excluded.metadata,
        profile_photo_url=excluded.profile_photo_url,
        source=excluded.source,
        status=excluded.status,
        updated_at=excluded.updated_at`;
    progress(
      "  CRM WhatsApp sessions",
      Math.min(offset + batch.length, rows.length),
      rows.length,
    );
  }
  log(
    `  CRM WhatsApp lead links: ${rows.length}/${rows.length} total ` +
      `(${leadLinks.crm_session_id} V1 sync id, ${leadLinks.source_lead_id} source id, ` +
      `${leadLinks.phone} phone, ${leadLinks.generated} generated); ` +
      `${linkedAssignments}/${rows.length} assignment(s).`,
  );
  return sessionIds;
}

async function seedWhatsappOnlyLead(tx, group, assignedUserId, config, ids) {
  const row = group.canonical;
  const id = targetId(config.legacyStoreId, "RepassesChatSessionLead", row.id);
  const buyerPhone = nullableString(
    normalizeWhatsappPhone(row.buyer_phone),
    40,
  );
  await tx`INSERT INTO leads
    (id, assigned_user_id, buyer_name, buyer_phone, last_interaction_at,
     metadata, source, status, store_id, tenant_id, created_at, updated_at)
    VALUES (${id}, ${assignedUserId}, ${nullableString(row.buyer_name, 191)},
      ${buyerPhone}, ${row.last_message_at},
      ${tx.json({
        legacyRepasses: {
          mergedSourceIds: group.members.map((member) => String(member.id)),
          sourceId: String(row.id),
          sourceTable: "chat_sessions",
          sourceUuid: row.uuid,
        },
        migration: { generatedForWhatsappCoverage: true },
      })},
      'whatsapp', 'new', ${ids.store}, ${ids.tenant},
      ${row.created_at}, ${row.updated_at ?? row.created_at})
    ON CONFLICT (id) DO UPDATE SET
      assigned_user_id=excluded.assigned_user_id,
      buyer_name=excluded.buyer_name,
      buyer_phone=excluded.buyer_phone,
      last_interaction_at=excluded.last_interaction_at,
      metadata=excluded.metadata,
      updated_at=excluded.updated_at`;
  return id;
}
