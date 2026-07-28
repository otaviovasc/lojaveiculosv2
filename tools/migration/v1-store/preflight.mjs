import { mapDocumentKind, mapRole } from "./common.mjs";
import {
  mapRepassesConnection,
  mapRepassesSessionStatus,
} from "./crm-whatsapp-mapping.mjs";
import {
  documentKindsForSale,
  mapEntryType,
  mapSalePaymentMethod,
} from "./sale-mapping.mjs";
import { normalizeFiscalKind } from "./spedy-fiscal-reconciliation.mjs";
import { log } from "./log.mjs";

export function validateMigrationData(data, config, modules) {
  log("Preflight: validating strict V1 mappings before database writes...");
  for (const access of data.accesses) mapRole(access.role);
  for (const document of data.documents) mapDocumentKind(document.type);
  for (const fiscal of data.fiscalDocuments)
    normalizeFiscalKind(fiscal.docType);

  if (modules.has("sales")) {
    for (const entry of data.entries) mapEntryType(entry.type);
    for (const entry of data.recurringEntries) mapEntryType(entry.type);
    for (const payment of data.salePayments)
      mapSalePaymentMethod(payment.method);
    for (const sale of data.sales)
      documentKindsForSale(data.documents, sale.id);
  }

  if (modules.has("whatsapp") && data.whatsapp) {
    for (const connection of data.whatsapp.connections)
      mapRepassesConnection(connection, {
        activate: config.activateWhatsappConnections,
      });
    for (const session of data.whatsapp.sessions)
      mapRepassesSessionStatus(session);
  }
  log("Preflight mappings OK");
}
