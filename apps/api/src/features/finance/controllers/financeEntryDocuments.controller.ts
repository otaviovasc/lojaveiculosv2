import { type Context, type Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  proxyDocumentContent,
  type DocumentContentFetcher,
} from "../../documents/adapters/proxyDocumentContent.js";
import { handleFinance } from "./finance.controller.http.js";
import type { FinanceServices } from "./financeServices.js";

export function registerFinanceEntryDocumentRoutes(
  financeFeature: Hono,
  services: FinanceServices,
  createContext: (context: Context) => Promise<ServiceContext>,
  contentFetcher?: DocumentContentFetcher,
): void {
  financeFeature.get(
    "/entries/:entryId/documents/:documentId/download",
    async (context) =>
      handleFinance(context, async () => {
        const serviceContext = await createContext(context);
        const download = await services.getEntryDocumentDownload(
          serviceContext,
          {
            documentId: context.req.param("documentId"),
            entryId: context.req.param("entryId"),
            ...(context.req.query("disposition") === "inline"
              ? { disposition: "inline" as const }
              : {}),
          },
        );
        return context.json(download);
      }),
  );

  financeFeature.get(
    "/entries/:entryId/documents/:documentId/content",
    async (context) =>
      handleFinance(context, async () => {
        const serviceContext = await createContext(context);
        const download = await services.getEntryDocumentDownload(
          serviceContext,
          {
            disposition: "inline",
            documentId: context.req.param("documentId"),
            entryId: context.req.param("entryId"),
          },
        );
        return proxyDocumentContent(download, contentFetcher);
      }),
  );
}
