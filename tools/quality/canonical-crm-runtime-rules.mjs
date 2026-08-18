const forbiddenLegacyCrmTerms = [
  "crm_connections",
  "crm.whatsapp.",
  "crm_whatsapp_sessions",
  "crm_whatsapp_messages",
  "crm_whatsapp_session_tags",
  "crm_whatsapp_session_command_receipts",
  "crm_whatsapp_intervention_ledger",
  "crmConnections",
  "crmWhatsappSessions",
  "crmWhatsappMessages",
  "crmWhatsappSessionTags",
  "crmWhatsappSessionCommandReceipts",
  "crmWhatsappInterventionLedger",
  "crm_whatsapp_quick_messages",
  "crm_whatsapp_outbound_intents",
  "crm_whatsapp_scheduled_messages",
  "crm_whatsapp_campaigns",
  "crm_whatsapp_campaign_recipients",
  '"crm_whatsapp_scheduled_message"',
  '"crm_whatsapp_campaign"',
  '"crm_whatsapp_quick_message"',
  "crmWhatsappQuickMessages",
  "crmWhatsappOutboundIntents",
  "crmWhatsappScheduledMessages",
  "crmWhatsappCampaigns",
  "crmWhatsappCampaignRecipients",
  "bot_integration_grants",
  "bot_action_commands",
  "provider_effects",
  "botIntegrationGrants",
  "botActionCommands",
  "providerEffects",
  "providerConnections",
  "canonicalMessages",
  "crm_whatsapp_bot",
  "composio_whatsapp",
  "composio_instagram",
  "normalizeLegacyConnection",
  "routingRules",
  "WEB_CHAT",
  "/whatsapp/sessions",
  "/whatsapp/cycles",
  "/whatsapp/conversations/start",
  "/whatsapp/send/text",
  "/whatsapp/campaigns",
  "/whatsapp/scheduled-messages",
  "/whatsapp/quick-messages",
  "/whatsapp/tags",
  "CrmWhatsappRepository",
  "crmWhatsappRepository",
  "CrmWhatsappSession",
  "crmWhatsappSession",
  "buyerChatLid",
  '"bot_api"',
  '"human_whatsapp"',
];

export function findLegacyCrmRuntimeReferences(source) {
  const findings = [];
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const term of forbiddenLegacyCrmTerms) {
      if (containsForbiddenTerm(line, term)) {
        findings.push({ line: index + 1, term });
      }
    }
  }
  return findings;
}

function containsForbiddenTerm(line, term) {
  if (term === "crm.whatsapp.") {
    return /["'`]crm\.whatsapp\./u.test(line);
  }
  if (term === "CrmWhatsappSession") {
    return /\bCrmWhatsappSession\b/u.test(line);
  }
  if (term === "crmWhatsappSession") {
    return /\bcrmWhatsappSession\b/u.test(line);
  }
  const allowedPrefix = new Map([
    ["bot_action_commands", "crm_external_"],
    ["bot_integration_grants", "crm_external_"],
    ["provider_effects", "crm_external_bot_"],
  ]).get(term);
  if (!allowedPrefix) return line.includes(term);

  let offset = line.indexOf(term);
  while (offset >= 0) {
    const actualPrefix = line.slice(
      Math.max(0, offset - allowedPrefix.length),
      offset,
    );
    if (actualPrefix !== allowedPrefix) {
      return true;
    }
    offset = line.indexOf(term, offset + term.length);
  }
  return false;
}
