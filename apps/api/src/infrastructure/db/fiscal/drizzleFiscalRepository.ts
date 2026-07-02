import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";
import type { FiscalRepository } from "../../../domains/fiscal/ports/fiscalRepository.js";
import {
  createDocument,
  createDocumentSnapshot,
  getDocument,
  getOverview,
  updateDocumentStatus,
} from "./drizzleFiscalDocumentOperations.js";
import {
  createRecipient,
  createTemplate,
  getRecipient,
  getTemplate,
  listRecipients,
  listTemplates,
  updateRecipient,
  updateTemplate,
} from "./drizzleFiscalCatalogOperations.js";

export type DrizzleFiscalClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleFiscalRepository(
  db: DrizzleFiscalClient,
): FiscalRepository {
  return {
    createDocument: (input) => createDocument(db, input),
    createDocumentSnapshot: (input) => createDocumentSnapshot(db, input),
    createRecipient: (input) => createRecipient(db, input),
    createTemplate: (input) => createTemplate(db, input),
    getDocument: (input) => getDocument(db, input),
    getOverview: (input) => getOverview(db, input),
    getRecipient: (input) => getRecipient(db, input),
    getTemplate: (input) => getTemplate(db, input),
    listRecipients: (input) => listRecipients(db, input),
    listTemplates: (input) => listTemplates(db, input),
    updateDocumentStatus: (input) => updateDocumentStatus(db, input),
    updateRecipient: (input) => updateRecipient(db, input),
    updateTemplate: (input) => updateTemplate(db, input),
  };
}
