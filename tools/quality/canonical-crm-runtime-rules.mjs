const forbiddenLegacyCrmTerms = [
  "crm_connections",
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
];

export function findLegacyCrmRuntimeReferences(source) {
  const findings = [];
  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const term of forbiddenLegacyCrmTerms) {
      if (line.includes(term)) findings.push({ line: index + 1, term });
    }
  }
  return findings;
}
