import { json, nullableString } from "./common.mjs";

export function normalizeWhatsappPhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0055")) digits = digits.slice(2);
  if (
    digits.startsWith("055") &&
    (digits.length === 13 || digits.length === 14)
  )
    digits = digits.slice(1);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

export function whatsappPhoneAliases(value) {
  const phone = normalizeWhatsappPhone(value);
  if (!phone) return [];
  const aliases = new Set([phone]);
  if (phone.startsWith("55") && phone.length === 12)
    aliases.add(`${phone.slice(0, 4)}9${phone.slice(4)}`);
  if (phone.startsWith("55") && phone.length === 13 && phone[4] === "9")
    aliases.add(`${phone.slice(0, 4)}${phone.slice(5)}`);
  return [...aliases];
}

export function buildLeadPhoneIndex(leads) {
  const candidates = new Map();
  for (const lead of leads) {
    for (const alias of whatsappPhoneAliases(lead.phone)) {
      const ids = candidates.get(alias) ?? new Set();
      ids.add(lead.id);
      candidates.set(alias, ids);
    }
  }
  return new Map(
    [...candidates].map(([phone, ids]) => [
      phone,
      ids.size === 1 ? [...ids][0] : null,
    ]),
  );
}

export function buildLeadCrmSessionIndex(leads) {
  const candidates = new Map();
  for (const lead of leads) {
    if (lead.crm_session_id === null || lead.crm_session_id === undefined)
      continue;
    const sessionId = Number(lead.crm_session_id);
    if (!Number.isInteger(sessionId)) continue;
    const ids = candidates.get(sessionId) ?? new Set();
    ids.add(lead.id);
    candidates.set(sessionId, ids);
  }
  return new Map(
    [...candidates].map(([sessionId, ids]) => [
      sessionId,
      ids.size === 1 ? [...ids][0] : null,
    ]),
  );
}

export function groupWhatsappSessions(sessions) {
  const grouped = new Map();
  for (const session of sessions) {
    const identity = sessionIdentity(session);
    const key = `${session.connection_id}:${canonicalRepassesMessagingChannel(session.channel)}:${identity}`;
    const members = grouped.get(key) ?? [];
    members.push(session);
    grouped.set(key, members);
  }
  return [...grouped.entries()].map(([key, members]) => ({
    buyerPhone: sessionIdentity(members[0]),
    canonical: [...members].sort(compareNewestFirst)[0],
    key,
    members,
  }));
}

export function canonicalRepassesMessagingChannel(channel) {
  return channel === "OLX_CHAT" || channel === "olx_chat"
    ? "olx_chat"
    : "whatsapp";
}

export function crmChannelConnectionMapKey(connectionId, channel) {
  return `${String(connectionId)}:${canonicalRepassesMessagingChannel(channel)}`;
}

export function resolveCrmChannelConnectionId(
  connectionIds,
  connectionId,
  channel,
) {
  return (
    connectionIds.get(crmChannelConnectionMapKey(connectionId, channel)) ??
    (canonicalRepassesMessagingChannel(channel) === "whatsapp"
      ? connectionIds.get(connectionId)
      : undefined)
  );
}

export function countTargetCrmChannelConnections(source) {
  const keys = new Set();
  for (const connection of source.connections) {
    const channels = source.sessions
      .filter((session) => session.connection_id === connection.id)
      .map((session) => canonicalRepassesMessagingChannel(session.channel));
    if (channels.length === 0) channels.push("whatsapp");
    for (const channel of channels) {
      keys.add(crmChannelConnectionMapKey(connection.id, channel));
    }
  }
  return keys.size;
}

export function resolveLegacyLeadLink(
  group,
  leadCrmSessionIndex,
  leadPhoneIndex,
  knownLeadIds,
) {
  const sourceLeadIds = new Set(
    group.members
      .map((session) => Number(session.source_lead_id))
      .filter((id) => knownLeadIds.has(id)),
  );
  if (sourceLeadIds.size > 1) return { leadId: null, strategy: "ambiguous" };

  const syncedLeadIds = new Set();
  let ambiguousSyncedId = false;
  for (const session of group.members) {
    const sessionId = Number(session.id);
    if (
      leadCrmSessionIndex.has(sessionId) &&
      leadCrmSessionIndex.get(sessionId) === null
    )
      ambiguousSyncedId = true;
    const leadId = leadCrmSessionIndex.get(sessionId);
    if (leadId !== null && leadId !== undefined) syncedLeadIds.add(leadId);
  }
  if (ambiguousSyncedId) return { leadId: null, strategy: "ambiguous" };
  if (syncedLeadIds.size > 1) return { leadId: null, strategy: "ambiguous" };
  const exactLeadIds = new Set([...sourceLeadIds, ...syncedLeadIds]);
  if (exactLeadIds.size > 1) return { leadId: null, strategy: "ambiguous" };
  if (exactLeadIds.size === 1) {
    const leadId = [...exactLeadIds][0];
    return {
      leadId,
      strategy: syncedLeadIds.has(leadId) ? "crm_session_id" : "source_lead_id",
    };
  }

  const phoneMatches = new Set();
  for (const session of group.members) {
    for (const alias of whatsappPhoneAliases(session.buyer_phone)) {
      const leadId = leadPhoneIndex.get(alias);
      if (leadId !== null && leadId !== undefined) phoneMatches.add(leadId);
    }
  }
  if (phoneMatches.size === 1)
    return { leadId: [...phoneMatches][0], strategy: "phone" };
  return {
    leadId: null,
    strategy: phoneMatches.size > 1 ? "ambiguous" : "unmatched",
  };
}

export function findLegacyLeadId(
  group,
  leadPhoneIndex,
  knownLeadIds,
  leadCrmSessionIndex = new Map(),
) {
  return resolveLegacyLeadLink(
    group,
    leadCrmSessionIndex,
    leadPhoneIndex,
    knownLeadIds,
  ).leadId;
}

export function mapRepassesConnection(connection, options = {}) {
  if (connection.provider !== "ZAPI")
    throw new Error(
      `Unsupported Repasses CRM provider ${connection.provider} on connection ${connection.id}.`,
    );
  const credentials = json(connection.credentials);
  const instanceId = nullableString(credentials.instanceId, 191);
  const instanceToken = nullableString(credentials.token, 1000);
  const hasStoredCredentials = Boolean(instanceId && instanceToken);
  const sealCredential = options.sealCredential;
  if (hasStoredCredentials && !sealCredential) {
    throw new Error("A CRM credential sealer is required for Z-API import.");
  }
  const credentialsRef = hasStoredCredentials
    ? {
        mode: "stored",
        stored: {
          instanceId: sealCredential({
            plaintext: instanceId,
            purpose: "zapi.instance-id",
          }),
          instanceToken: sealCredential({
            plaintext: instanceToken,
            purpose: "zapi.instance-token",
          }),
        },
      }
    : {};
  return {
    credentialsRef,
    externalInstanceId: null,
    lookupInstanceId: instanceId ?? nullableString(connection.instance_id, 191),
    provider: "zapi",
    status: mapConnectionStatus(
      connection,
      hasStoredCredentials,
      options.activate === true,
    ),
  };
}

export function mapRepassesSessionStatus(session) {
  if (session.deleted_at) return "EXPIRED";
  if (session.status === "WAITING_RESPONSE") return "ACTIVE";
  const supported = new Set([
    "ACTIVE",
    "COMPLETED",
    "EXPIRED",
    "HUMAN_TAKEOVER",
    "MINIBOT_ACTIVE",
  ]);
  return supported.has(session.status) ? session.status : "ACTIVE";
}

function sessionIdentity(session) {
  const phone = normalizeWhatsappPhone(session.buyer_phone);
  if (phone) return phone;
  const lid = nullableString(session.buyer_chat_lid, 191);
  return lid ? `lid:${lid}` : `legacy-session:${session.uuid ?? session.id}`;
}

function compareNewestFirst(left, right) {
  const leftTime = Date.parse(
    left.last_message_at ?? left.updated_at ?? left.created_at,
  );
  const rightTime = Date.parse(
    right.last_message_at ?? right.updated_at ?? right.created_at,
  );
  if (leftTime !== rightTime) return rightTime - leftTime;
  return right.id - left.id;
}

function mapConnectionStatus(connection, hasStoredCredentials, activate) {
  if (!connection.is_active || connection.deleted_at) return "archived";
  if (!hasStoredCredentials) return "disconnected";
  if (!activate) return "paused";
  if (connection.status === "CONNECTED") return "active";
  if (connection.status === "ERROR" || connection.status === "BANNED")
    return "error";
  if (connection.status === "DISCONNECTED") return "disconnected";
  return "paused";
}
