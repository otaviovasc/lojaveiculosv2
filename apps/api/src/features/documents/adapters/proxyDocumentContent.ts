import type { DocumentDownloadDescriptor } from "../../../domains/documents/services/DocumentOperationService/downloadDocument.js";

export type DocumentContentFetcher = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export type DocumentContentPolicy = {
  maxBytes?: number;
  timeoutMs?: number;
};

export class DocumentContentDeliveryError extends Error {
  constructor() {
    super("Document content could not be delivered.");
    this.name = "DocumentContentDeliveryError";
  }
}

export async function proxyDocumentContent(
  download: DocumentDownloadDescriptor,
  fetcher: DocumentContentFetcher = (url, init) => fetch(url, init),
  policy: DocumentContentPolicy = {},
) {
  const maxBytes = policy.maxBytes ?? maxDocumentContentBytes;
  const timeoutMs = policy.timeoutMs ?? documentContentTimeoutMs;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  let upstream: Response;
  try {
    upstream = await fetcher(download.downloadUrl, {
      signal: abortController.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new DocumentContentDeliveryError();
  }
  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeout);
    throw new DocumentContentDeliveryError();
  }
  const contentLength = parseContentLength(
    upstream.headers.get("content-length"),
  );
  if (contentLength !== null && contentLength > maxBytes) {
    clearTimeout(timeout);
    await upstream.body.cancel();
    throw new DocumentContentDeliveryError();
  }

  const contentType = safeInlineContentType(download.mimeType);
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": createContentDisposition(
      download.fileName,
      Boolean(contentType),
    ),
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Type": contentType ?? "application/octet-stream",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  });
  if (contentLength !== null) {
    headers.set("Content-Length", String(contentLength));
  }

  return new Response(
    limitResponseBody(upstream.body, maxBytes, () => clearTimeout(timeout)),
    {
      headers,
      status: 200,
    },
  );
}

function safeInlineContentType(value: string | null) {
  if (!value) return null;
  const normalized = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return safeInlineContentTypes.has(normalized) ? normalized : null;
}

function createContentDisposition(fileName: string, inline: boolean) {
  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

const safeInlineContentTypes = new Set([
  "application/pdf",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const documentContentTimeoutMs = 15_000;
const maxDocumentContentBytes = 25 * 1024 * 1024;

function parseContentLength(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function limitResponseBody(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  onFinished: () => void,
) {
  const reader = body.getReader();
  let receivedBytes = 0;
  return new ReadableStream<Uint8Array>({
    async cancel(reason) {
      onFinished();
      await reader.cancel(reason);
    },
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          onFinished();
          controller.close();
          return;
        }
        receivedBytes += result.value.byteLength;
        if (receivedBytes > maxBytes) {
          onFinished();
          await reader.cancel();
          controller.error(new DocumentContentDeliveryError());
          return;
        }
        controller.enqueue(result.value);
      } catch {
        onFinished();
        controller.error(new DocumentContentDeliveryError());
      }
    },
  });
}
