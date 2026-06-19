import type {
  AttachFinanceDocumentInput,
  CommissionRule,
  CreateCommissionRuleInput,
  CreateFinanceEntryInput,
  CreateFinanceRecurringEntryInput,
  FinanceAuth,
  FinanceDocumentUpload,
  FinanceEntry,
  FinanceEntryBundle,
  FinanceRecurringEntry,
  FinanceSummary,
  FinanceEntryType,
  UpdateFinanceEntryInput,
} from "./types";
import { createFinanceHeaders, financeRoutes } from "./apiRoutes";
import { cleanJson, readJson, readUpload, type JsonBody } from "./apiJson";

export {
  createFinanceEndpoint,
  createFinanceHeaders,
  financeRoutes,
} from "./apiRoutes";

export type FinanceApi = {
  attachDocument: (
    entryId: string,
    input: AttachFinanceDocumentInput,
  ) => Promise<unknown>;
  createEntry: (input: CreateFinanceEntryInput) => Promise<FinanceEntryBundle>;
  createEntryFlow: (
    input: CreateFinanceEntryFlowInput,
  ) => Promise<FinanceEntryBundle>;
  createCommissionRule: (
    input: CreateCommissionRuleInput,
  ) => Promise<CommissionRule>;
  createRecurringEntry: (
    input: CreateFinanceRecurringEntryInput,
  ) => Promise<FinanceRecurringEntry>;
  getSummary: () => Promise<FinanceSummary>;
  listEntries: (type: FinanceEntryType) => Promise<FinanceEntry[]>;
  listCommissionRules: () => Promise<CommissionRule[]>;
  listRecurringEntries: () => Promise<FinanceRecurringEntry[]>;
  payEntry: (entryId: string) => Promise<FinanceEntryBundle>;
  cancelEntry: (
    entryId: string,
    reason?: string,
  ) => Promise<FinanceEntryBundle>;
  requestDocumentUpload: (
    entryId: string,
    file: File,
  ) => Promise<FinanceDocumentUpload>;
  updateEntry: (
    entryId: string,
    input: UpdateFinanceEntryInput,
  ) => Promise<FinanceEntryBundle>;
};

export type CreateFinanceEntryFlowInput = CreateFinanceEntryInput & {
  documentFile?: File | null;
  documentKind?: string;
  documentTitle?: string;
};

export type CreateFinanceApiOptions = {
  auth?: FinanceAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createFinanceApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateFinanceApiOptions): FinanceApi {
  const postJson = <T>(route: string, body: JsonBody) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createFinanceHeaders(auth),
      method: "POST",
    }).then(readJson<T>);
  const patchJson = <T>(route: string, body: JsonBody) =>
    fetch(route, {
      body: JSON.stringify(cleanJson(body)),
      headers: createFinanceHeaders(auth),
      method: "PATCH",
    }).then(readJson<T>);

  const createEntry = (input: CreateFinanceEntryInput) =>
    postJson<FinanceEntryBundle>(financeRoutes.entries(baseUrl), {
      amountCents: input.amountCents,
      category: input.category,
      dueAt: input.dueAt,
      links: input.links ?? [],
      metadata: input.metadata ?? {},
      name: input.name,
      paidAt: input.paidAt,
      sellerUserId: input.sellerUserId,
      status: input.status,
      type: input.type,
    });

  const requestDocumentUpload = (entryId: string, file: File) =>
    postJson<FinanceDocumentUpload>(
      financeRoutes.documentUploads(entryId, baseUrl),
      {
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
        sizeBytes: file.size,
      },
    );

  const attachDocument = (entryId: string, input: AttachFinanceDocumentInput) =>
    postJson<unknown>(financeRoutes.documents(entryId, baseUrl), {
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      kind: input.kind,
      mimeType: input.mimeType,
      storageKey: input.storageKey,
      title: input.title,
    });

  return {
    attachDocument,
    cancelEntry: (entryId, reason) =>
      postJson<FinanceEntryBundle>(
        financeRoutes.cancelEntry(entryId, baseUrl),
        {
          reason,
        },
      ),
    createEntry,
    createCommissionRule: (input) =>
      postJson<CommissionRule>(financeRoutes.commissionRules(baseUrl), input),
    createEntryFlow: async ({
      documentFile,
      documentKind,
      documentTitle,
      ...input
    }) => {
      const bundle = await createEntry(input);
      if (!documentFile) return bundle;

      const upload = await requestDocumentUpload(bundle.entry.id, documentFile);
      await fetch(upload.uploadUrl, {
        body: documentFile,
        method: upload.uploadMethod ?? "PUT",
        ...(upload.uploadHeaders ? { headers: upload.uploadHeaders } : {}),
      }).then(readUpload);
      await attachDocument(bundle.entry.id, {
        fileName: documentFile.name,
        fileSizeBytes: documentFile.size,
        kind: documentKind || "finance_receipt",
        mimeType: documentFile.type || "application/octet-stream",
        storageKey: upload.storageKey,
        title: documentTitle || documentFile.name,
      });

      return bundle;
    },
    createRecurringEntry: (input) =>
      postJson<FinanceRecurringEntry>(
        financeRoutes.recurringEntries(baseUrl),
        input,
      ),
    getSummary: () =>
      fetch(financeRoutes.summary(baseUrl), {
        headers: createFinanceHeaders(auth),
      }).then(readJson<FinanceSummary>),
    listEntries: (type) =>
      fetch(financeRoutes.entries(baseUrl, type), {
        headers: createFinanceHeaders(auth),
      })
        .then(readJson<FinanceEntry[] | { entries: FinanceEntry[] }>)
        .then((payload) =>
          Array.isArray(payload) ? payload : payload.entries,
        ),
    listCommissionRules: () =>
      fetch(financeRoutes.commissionRules(baseUrl), {
        headers: createFinanceHeaders(auth),
      })
        .then(readJson<{ commissionRules: CommissionRule[] }>)
        .then((payload) => payload.commissionRules),
    listRecurringEntries: () =>
      fetch(financeRoutes.recurringEntries(baseUrl), {
        headers: createFinanceHeaders(auth),
      })
        .then(readJson<{ recurringEntries: FinanceRecurringEntry[] }>)
        .then((payload) => payload.recurringEntries),
    payEntry: (entryId) =>
      postJson<FinanceEntryBundle>(
        financeRoutes.payEntry(entryId, baseUrl),
        {},
      ),
    requestDocumentUpload,
    updateEntry: (entryId, input) =>
      patchJson<FinanceEntryBundle>(
        financeRoutes.entry(entryId, baseUrl),
        input,
      ),
  };
}
