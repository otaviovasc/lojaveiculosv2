import {
  entryIdParameter,
  entryMutation,
  mutation,
  operation,
  query,
} from "./financeOpenApiParts.js";
import { financeAutoEntryPaths } from "./financeAutoEntryOpenApi.js";
import { commissionWorkspacePaths } from "./commissionWorkspaceOpenApi.js";

export const financePaths = {
  ...financeAutoEntryPaths,
  ...commissionWorkspacePaths,
  "/api/v1/finance/summary": {
    get: operation(
      "finance.read",
      "Read finance summary",
      "getFinanceSummary",
      "FinanceSummary",
    ),
  },
  "/api/v1/finance/entries": {
    get: {
      ...operation(
        "finance.read",
        "List finance entries",
        "listFinanceEntries",
        "FinanceEntryListResponse",
      ),
      parameters: [
        query("limit", "integer"),
        query("offset", "integer"),
        query("status", "string"),
        query("targetId", "string"),
        query("targetType", "string"),
        query("type", "string"),
      ],
    },
    post: mutation(
      "finance.create",
      "Create finance entry",
      "createFinanceEntry",
      "CreateFinanceEntryRequest",
      "FinanceEntryUploadResponse",
      201,
    ),
  },
  "/api/v1/finance/entries/{entryId}": {
    get: {
      ...operation(
        "finance.read",
        "Read finance entry detail",
        "getFinanceEntry",
        "FinanceEntryDetail",
      ),
      parameters: [entryIdParameter],
    },
    patch: {
      ...mutation(
        "finance.update",
        "Update finance entry",
        "updateFinanceEntry",
        "UpdateFinanceEntryRequest",
        "FinanceEntryBundle",
      ),
      parameters: [entryIdParameter],
    },
    delete: {
      ...operation(
        "finance.update",
        "Cancel finance entry",
        "deleteFinanceEntry",
        "FinanceEntryBundle",
      ),
      parameters: [entryIdParameter, query("reason", "string")],
    },
  },
  "/api/v1/finance/entries/{entryId}/pay": {
    post: entryMutation(
      "Mark finance entry as paid",
      "payFinanceEntry",
      "PayFinanceEntryRequest",
    ),
  },
  "/api/v1/finance/entries/{entryId}/cancel": {
    post: entryMutation(
      "Cancel finance entry",
      "cancelFinanceEntry",
      "CancelFinanceEntryRequest",
    ),
  },
  "/api/v1/finance/entries/{entryId}/documents/uploads": {
    post: {
      ...mutation(
        "finance.attach_document",
        "Request finance document upload",
        "requestFinanceDocumentUpload",
        "RequestFinanceDocumentUploadRequest",
        "FinanceObjectUpload",
        201,
      ),
      parameters: [entryIdParameter],
    },
  },
  "/api/v1/finance/entries/{entryId}/documents": {
    post: {
      ...mutation(
        "finance.attach_document",
        "Attach finance document",
        "attachFinanceDocument",
        "AttachFinanceDocumentRequest",
        "FinanceDocument",
        201,
      ),
      parameters: [entryIdParameter],
    },
  },
  "/api/v1/finance/recurring-entries": {
    get: operation(
      "finance.read",
      "List recurring finance entries",
      "listFinanceRecurringEntries",
      "FinanceRecurringEntryListResponse",
    ),
    post: mutation(
      "finance.create",
      "Create recurring finance entry",
      "createFinanceRecurringEntry",
      "CreateFinanceRecurringEntryRequest",
      "FinanceRecurringEntry",
      201,
    ),
  },
  "/api/v1/finance/commission-rules": {
    get: operation(
      "finance.read",
      "List commission rules",
      "listCommissionRules",
      "CommissionRuleListResponse",
    ),
    post: mutation(
      "finance.create",
      "Create commission rule",
      "createCommissionRule",
      "CreateCommissionRuleRequest",
      "CommissionRule",
      201,
    ),
  },
} as const;
