import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight,
  Download,
  FolderArchive,
  Loader2,
  Car,
  User,
  Coins,
  ChevronLeft,
  Calendar,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { SaleDocumentKind, SaleRecord } from "./types";
import { formatCents, formatDocumentKindLabel } from "./salesModel";
import { createDocumentsApi } from "../documents/apiClient";
import { createDocumentsApiOptions } from "../documents/runtimeApi";
import type { WorkspaceDocument } from "../documents/types";
import BorderGlow from "../../components/ui/BorderGlow";
import {
  buildStoredDocumentsZip,
  downloadStoredDocument,
  triggerBrowserDownload,
} from "./saleFinalizationDownloads";

type DocumentLoadState = "idle" | "loading" | "ready" | "error";
type DownloadFeedback = {
  message: string;
  tone: "success" | "info" | "error";
};
const feedbackClasses: Record<DownloadFeedback["tone"], string> = {
  error:
    "px-4 py-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-bold flex flex-row items-center gap-2 animate-in fade-in",
  info: "px-4 py-3 rounded-xl border border-accent/30 bg-accent/10 text-app-text text-xs font-bold flex flex-row items-center gap-2 animate-in fade-in",
  success:
    "px-4 py-3 rounded-xl border border-success/30 bg-success/10 text-success-strong text-xs font-bold flex flex-row items-center gap-2 animate-in fade-in",
};

export function FinalizationSection({
  canClose = false,
  isSaving = false,
  onBack,
  onClose,
  sale,
}: {
  canClose?: boolean;
  isSaving?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  sale: SaleRecord;
}) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [documentLoadAttempt, setDocumentLoadAttempt] = useState(0);
  const [documentLoadState, setDocumentLoadState] =
    useState<DocumentLoadState>("idle");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>(
    {},
  );
  const [isZipping, setIsZipping] = useState(false);
  const [downloadFeedback, setDownloadFeedback] =
    useState<DownloadFeedback | null>(null);

  const isClosed = sale.status === "closed";
  const selectedDocs = sale.selectedDocumentKinds;

  useEffect(() => {
    if (!isClosed) {
      setDocuments([]);
      setDocumentLoadState("idle");
      return;
    }
    let isActive = true;
    setDocuments([]);
    setDocumentLoadState("loading");

    void createDocumentsApiOptions()
      .then((opts) => createDocumentsApi(opts))
      .then((api) => {
        const queries = [
          api.listDocuments({ targetId: sale.id, targetType: "sale" }),
          ...(sale.unitId
            ? [
                api.listDocuments({
                  targetId: sale.unitId,
                  targetType: "vehicle_unit",
                }),
              ]
            : []),
        ];
        return Promise.allSettled(queries);
      })
      .then((queryResults) => {
        if (!isActive) return;
        const documentGroups = queryResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        if (documentGroups.length === 0) {
          throw new Error("sale_documents_unavailable");
        }
        const matching = Array.from(
          new Map(
            documentGroups
              .flat()
              .filter(
                (document) =>
                  selectedDocs.includes(document.kind as SaleDocumentKind) &&
                  (document.metadata.saleId === sale.id ||
                    (document.context.targetType === "sale" &&
                      document.context.targetId === sale.id)),
              )
              .map((document) => [document.id, document]),
          ).values(),
        );
        setDocuments(matching);
        setDocumentLoadState("ready");
      })
      .catch(() => {
        if (!isActive) return;
        setDocuments([]);
        setDocumentLoadState("error");
      });

    return () => {
      isActive = false;
    };
  }, [documentLoadAttempt, isClosed, sale.id, sale.unitId, selectedDocs]);

  useEffect(() => {
    if (!downloadFeedback) return;
    const timer = setTimeout(() => setDownloadFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [downloadFeedback]);

  const handleDownloadSingle = async (
    document: WorkspaceDocument,
    docTitle: string,
  ) => {
    setDownloadingId(document.id);
    setDownloadFeedback(null);
    setDownloadErrors((current) => {
      const next = { ...current };
      delete next[document.id];
      return next;
    });
    try {
      const download = await downloadStoredDocument(document);
      triggerBrowserDownload(download.blob, download.fileName);
      setDownloadFeedback({
        message: `Download iniciado: ${docTitle}.`,
        tone: "success",
      });
    } catch {
      const message = "Não foi possível baixar o arquivo armazenado.";
      setDownloadErrors((current) => ({
        ...current,
        [document.id]: message,
      }));
      setDownloadFeedback({ message, tone: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    setDownloadFeedback(null);
    try {
      if (documents.length === 0) {
        setDownloadFeedback({
          message: "Nenhum documento armazenado está disponível para o pacote.",
          tone: "info",
        });
        return;
      }
      const rawTitle = String(sale.listingSnapshot.title || "venda");
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const zip = await buildStoredDocumentsZip(
        documents,
        `documentos-${safeTitle}-${sale.id.slice(0, 8)}.zip`,
      );
      if (!zip) {
        setDownloadFeedback({
          message:
            "Nenhum arquivo armazenado pôde ser recuperado para o pacote.",
          tone: "error",
        });
        return;
      }
      triggerBrowserDownload(zip.blob, zip.fileName);
      setDownloadFeedback({
        message:
          zip.failedCount === 0
            ? `Download do pacote iniciado com ${zip.count} ${zip.count === 1 ? "documento" : "documentos"}.`
            : `Download do pacote iniciado com ${zip.count} ${zip.count === 1 ? "documento" : "documentos"}. ${zip.failedCount} ${zip.failedCount === 1 ? "arquivo não pôde" : "arquivos não puderam"} ser recuperado${zip.failedCount === 1 ? "" : "s"}.`,
        tone: zip.failedCount === 0 ? "success" : "info",
      });
    } catch {
      setDownloadFeedback({
        message: "Não foi possível gerar o pacote com os arquivos armazenados.",
        tone: "error",
      });
    } finally {
      setIsZipping(false);
    }
  };

  const goToNfe = () => {
    window.location.hash = "/fiscal";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      {isClosed ? (
        <div className="bg-panel border border-line rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-3 bg-gradient-to-b from-success/10 to-transparent border-success/30">
          <div className="size-16 rounded-full bg-success/20 text-success-strong border border-success/30 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="size-9" />
          </div>
          <div className="max-w-xl">
            <span className="inline-block px-3 py-1 rounded-full bg-success/15 text-success-strong text-xs font-black uppercase tracking-wider mb-2">
              Venda concluída
            </span>
            <h3 className="text-lg font-black text-app-text">
              Fechamento registrado no sistema
            </h3>
            <p className="text-xs font-bold text-muted leading-relaxed mt-1">
              Abaixo, o sistema confirma quais documentos desta venda estão
              armazenados e disponíveis para download.
            </p>
          </div>

          {/* Quick Info Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2 text-xs font-bold">
            <div className="bg-app/60 border border-line/60 rounded-xl p-3 flex items-center gap-2.5">
              <User className="size-4 text-accent shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-muted block text-xs uppercase">
                  Cliente
                </span>
                <span className="text-app-text font-black block truncate">
                  {String(sale.buyerSnapshot.name || "Não informado")}
                </span>
              </div>
            </div>

            <div className="bg-app/60 border border-line/60 rounded-xl p-3 flex items-center gap-2.5">
              <Car className="size-4 text-accent shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-muted block text-xs uppercase">
                  Veículo
                </span>
                <span className="text-app-text font-black block truncate">
                  {String(sale.listingSnapshot.title || "Veículo")}
                </span>
              </div>
            </div>

            <div className="bg-app/60 border border-line/60 rounded-xl p-3 flex items-center gap-2.5">
              <Coins className="size-4 text-accent shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-muted block text-xs uppercase">
                  Valor Total
                </span>
                <span className="text-success-strong font-black block truncate">
                  {formatCents(sale.salePriceCents)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center gap-3">
          <div className="size-14 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center justify-center">
            <FileText className="size-7" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base font-black text-app-text uppercase tracking-wider">
              {canClose
                ? "Revise antes de fechar a venda"
                : "Há pendências antes do fechamento"}
            </h3>
            <p className="text-xs font-bold text-muted leading-relaxed mt-1">
              {canClose
                ? "Confirme os dados e os documentos selecionados. Os downloads só serão liberados quando os arquivos aparecerem no repositório."
                : "Volte às etapas com pendências, complete os dados obrigatórios e faça uma nova revisão."}
            </p>
          </div>
        </div>
      )}

      {/* Download feedback notification */}
      {downloadFeedback ? (
        <div
          aria-live={downloadFeedback.tone === "error" ? "assertive" : "polite"}
          className={feedbackClasses[downloadFeedback.tone]}
          role={downloadFeedback.tone === "error" ? "alert" : "status"}
        >
          {downloadFeedback.tone === "error" ? (
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span>{downloadFeedback.message}</span>
        </div>
      ) : null}

      {/* Document Section */}
      <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/45 pb-3">
          <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-4.5 text-accent" />
            <span>Documentos da Formalização</span>
          </h4>

          {isClosed ? (
            <button
              className="sales-primary-button inline-flex flex-row items-center gap-2 whitespace-nowrap text-xs disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isZipping ||
                documentLoadState !== "ready" ||
                documents.length === 0
              }
              onClick={() => void handleDownloadAllZip()}
              type="button"
            >
              <div className="gloss-overlay" />
              {isZipping ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <FolderArchive aria-hidden="true" className="size-4" />
              )}
              <span>
                {isZipping ? "Compactando..." : "Baixar arquivos (.ZIP)"}
              </span>
            </button>
          ) : (
            <span className="text-xs font-bold text-muted">
              Downloads disponíveis após o fechamento
            </span>
          )}
        </div>

        {isClosed && documentLoadState === "loading" ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-bold text-muted">
            <Loader2 className="size-6 animate-spin text-accent" />
            <span>Localizando documentos no repositório...</span>
          </div>
        ) : isClosed && documentLoadState === "error" ? (
          <div
            className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger"
            role="alert"
          >
            <div className="flex flex-row items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black">
                  Não foi possível carregar os documentos.
                </p>
                <p className="mt-1 text-xs font-medium">
                  Nenhum arquivo foi marcado como disponível.
                </p>
              </div>
              <button
                className="sales-secondary-button inline-flex flex-row items-center gap-2 whitespace-nowrap text-xs"
                onClick={() => setDocumentLoadAttempt((attempt) => attempt + 1)}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          </div>
        ) : selectedDocs.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-muted">
            Nenhum documento selecionado na etapa de documentação.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedDocs.map((kind) => {
              const label = formatDocumentKindLabel(kind);
              const matchingDoc = documents.find(
                (d) => d.kind === kind || d.context?.linkRole === kind,
              );
              const isDownloadingThis =
                downloadingId === (matchingDoc?.id ?? kind);
              const downloadError = matchingDoc
                ? downloadErrors[matchingDoc.id]
                : undefined;

              return (
                <div
                  key={kind}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-app-elevated/25 border border-line/40 rounded-xl hover:border-line transition-all gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-accent-soft text-accent-strong shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-app-text block truncate">
                          {label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-panel border border-line text-xs font-black text-muted uppercase">
                          PDF
                        </span>
                      </div>
                      <span className="text-xs text-muted font-medium block mt-0.5">
                        {!isClosed
                          ? "Selecionado para emissão. O download depende do arquivo armazenado após o fechamento."
                          : matchingDoc
                            ? "Arquivo confirmado no repositório."
                            : "Documento não localizado no repositório desta venda."}
                      </span>
                      {downloadError ? (
                        <span className="mt-1 block text-xs font-bold text-danger">
                          {downloadError}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isClosed && matchingDoc ? (
                      <button
                        className="sales-secondary-button inline-flex flex-row items-center gap-2 whitespace-nowrap text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isDownloadingThis}
                        onClick={() =>
                          void handleDownloadSingle(matchingDoc, label)
                        }
                        type="button"
                      >
                        {isDownloadingThis ? (
                          <Loader2
                            aria-hidden="true"
                            className="size-3.5 animate-spin"
                          />
                        ) : downloadError ? (
                          <RefreshCw aria-hidden="true" className="size-3.5" />
                        ) : (
                          <Download
                            aria-hidden="true"
                            className="size-3.5 text-accent"
                          />
                        )}
                        <span>
                          {isDownloadingThis
                            ? "Baixando..."
                            : downloadError
                              ? "Tentar download"
                              : "Baixar arquivo"}
                        </span>
                      </button>
                    ) : (
                      <span className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-black text-muted">
                        {isClosed ? "Indisponível" : "Aguardando fechamento"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Banners & Next Steps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* NF-e Action */}
        <BorderGlow
          borderRadius={16}
          glowIntensity={0.4}
          colors={["var(--color-blue-start)", "var(--color-accent)"]}
        >
          <div className="p-5 bg-panel/90 border border-line/40 rounded-2xl flex flex-col justify-between gap-4 h-full">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-soft text-blue-start border border-blue-start/20 shrink-0">
                <ExternalLink className="size-5" />
              </div>
              <div>
                <span className="text-xs font-black text-app-text block uppercase tracking-wider">
                  Módulo Fiscal / NF-e
                </span>
                <span className="text-xs font-medium text-muted block mt-0.5 leading-relaxed">
                  Acesse a área fiscal para revisar os dados antes de qualquer
                  emissão oficial.
                </span>
              </div>
            </div>

            <button
              className="sales-primary-button inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap bg-blue-start hover:bg-blue-end text-white text-xs"
              onClick={goToNfe}
              type="button"
            >
              <div className="gloss-overlay" />
              <span>Ir para Emissão de NF-e</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </BorderGlow>

        {/* Back to List / Next Sale */}
        <div className="p-5 bg-panel border border-line rounded-2xl flex flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-panel border border-line text-muted shrink-0">
              <Calendar className="size-5" />
            </div>
            <div>
              <span className="text-xs font-black text-app-text block uppercase tracking-wider">
                Lista de Vendas & CRM
              </span>
              <span className="text-xs font-medium text-muted block mt-0.5 leading-relaxed">
                Retorne à lista geral para acompanhar outras vendas ou iniciar
                nova proposta.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBack && (
              <button
                className="sales-secondary-button inline-flex flex-row flex-1 items-center justify-center gap-2 whitespace-nowrap text-xs"
                onClick={onBack}
                type="button"
              >
                <ChevronLeft className="size-4" />
                <span>Lista de Vendas</span>
              </button>
            )}

            {!isClosed && onClose && (
              <button
                className="sales-primary-button inline-flex flex-row flex-1 items-center justify-center gap-2 whitespace-nowrap text-xs disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canClose || isSaving}
                onClick={onClose}
                type="button"
              >
                <div className="gloss-overlay" />
                <CheckCircle2 className="size-4" />
                <span>Fechar Venda Agora</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
