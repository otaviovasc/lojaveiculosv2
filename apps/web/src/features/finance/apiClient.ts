import type {
  AttachFinanceDocumentInput,
  CommissionRule,
  CommissionSettlementResult,
  CommissionWorkspaceSnapshot,
  CreateCommissionRuleInput,
  CreateFinanceEntryInput,
  CreateFinanceRecurringEntryInput,
  FinanceAuth,
  FinanceDocumentUpload,
  FinanceEntry,
  FinanceEntryList,
  FinanceEntryBundle,
  FinanceRecurringEntry,
  FinanceSummary,
  FinanceEntryType,
  UpdateFinanceEntryInput,
} from "./types";
import {
  createFinanceHeaders,
  financeRoutes,
  type ListFinanceEntriesInput,
} from "./apiRoutes";
import { cleanJson, readJson, type JsonBody } from "./apiJson";
import { mergeEntryMetadata } from "./financeBillsActions";
import { uploadFinanceDocumentObject } from "./financeDocumentUpload";

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
  getCommissionWorkspace: (input: {
    from: string;
    to: string;
  }) => Promise<CommissionWorkspaceSnapshot>;
  listAllEntries: (type: FinanceEntryType) => Promise<FinanceEntry[]>;
  listEntries: (input: ListFinanceEntriesInput) => Promise<FinanceEntryList>;
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
  settleCommissionEntries: (input: {
    entryIds: readonly string[];
    paidAt: string;
    sellerUserId: string;
  }) => Promise<CommissionSettlementResult>;
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
      await uploadFinanceDocumentObject(upload, documentFile, fetch);
      await attachDocument(bundle.entry.id, {
        fileName: documentFile.name,
        fileSizeBytes: documentFile.size,
        kind: documentKind || "finance_receipt",
        mimeType: documentFile.type || "application/octet-stream",
        storageKey: upload.storageKey,
        title: documentTitle || documentFile.name,
      });

      return patchJson<FinanceEntryBundle>(
        financeRoutes.entry(bundle.entry.id, baseUrl),
        {
          metadata: mergeEntryMetadata(input.metadata, {
            receipt: {
              fileName: documentFile.name,
              title: documentTitle || documentFile.name,
            },
          }),
        },
      );
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
    getCommissionWorkspace: (input) =>
      fetch(financeRoutes.commissionWorkspace(baseUrl, input), {
        headers: createFinanceHeaders(auth),
      }).then(readJson<CommissionWorkspaceSnapshot>),
    listAllEntries: (type) => listAllFinanceEntries(fetch, auth, baseUrl, type),
    listEntries: (input) =>
      fetch(financeRoutes.entries(baseUrl, input), {
        headers: createFinanceHeaders(auth),
      })
        .then(readJson<FinanceEntry[] | FinanceEntryList>)
        .then(toFinanceEntryList),
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
    settleCommissionEntries: (input) =>
      postJson<CommissionSettlementResult>(
        financeRoutes.commissionSettlement(baseUrl),
        input,
      ),
    updateEntry: (entryId, input) =>
      patchJson<FinanceEntryBundle>(
        financeRoutes.entry(entryId, baseUrl),
        input,
      ),
  };
}

async function listAllFinanceEntries(
  fetch: typeof globalThis.fetch,
  auth: FinanceAuth,
  baseUrl: string | undefined,
  type: FinanceEntryType,
): Promise<FinanceEntry[]> {
  const entries: FinanceEntry[] = [];
  const limit = 200;
  let offset = 0;
  for (;;) {
    const page = await fetch(
      financeRoutes.entries(baseUrl, { limit, offset, type }),
      { headers: createFinanceHeaders(auth) },
    )
      .then(readJson<FinanceEntry[] | FinanceEntryList>)
      .then(toFinanceEntryList);
    entries.push(...page.entries);
    if (!page.hasMore || page.nextOffset === null) return entries;
    offset = page.nextOffset;
  }
}

function toFinanceEntryList(payload: FinanceEntry[] | FinanceEntryList) {
  if (!Array.isArray(payload)) return payload;
  return {
    entries: payload,
    hasMore: false,
    nextOffset: null,
  };
}
