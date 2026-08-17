import { useState, useEffect } from "react";
import {
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
} from "lucide-react";
import type { SaleDocumentKind, SaleRecord } from "./types";
import { formatCents, formatDocumentKindLabel } from "./salesModel";
import { createDocumentsApi } from "../documents/apiClient";
import { createDocumentsApiOptions } from "../documents/runtimeApi";
import type { WorkspaceDocument } from "../documents/types";
import BorderGlow from "../../components/ui/BorderGlow";

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
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const isClosed = sale.status === "closed";
  const selectedDocs = sale.selectedDocumentKinds;

  useEffect(() => {
    if (!isClosed) return;
    let isActive = true;
    setIsLoadingDocs(true);

    void createDocumentsApiOptions()
      .then((opts) => createDocumentsApi(opts))
      .then((api) =>
        api.listDocuments(
          sale.unitId
            ? { targetId: sale.unitId, targetType: "vehicle_unit" }
            : { targetId: sale.id },
        ),
      )
      .then((docs) => {
        if (!isActive) return;
        const matching = docs.filter(
          (d) =>
            d.metadata?.saleId === sale.id ||
            selectedDocs.includes(d.kind as SaleDocumentKind) ||
            d.context?.targetId === sale.unitId,
        );
        setDocuments(matching.length > 0 ? matching : docs);
      })
      .catch(() => {
        if (!isActive) return;
        setDocuments([]);
      })
      .finally(() => {
        if (isActive) setIsLoadingDocs(false);
      });

    return () => {
      isActive = false;
    };
  }, [
    isClosed,
    sale.id,
    sale.selectedDocumentKinds,
    sale.unitId,
    selectedDocs,
  ]);

  useEffect(() => {
    if (!downloadMessage) return;
    const timer = setTimeout(() => setDownloadMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [downloadMessage]);

  const handleDownloadSingle = async (
    docKey: string,
    docTitle: string,
    docId?: string,
  ) => {
    setDownloadingId(docKey);
    setDownloadMessage(null);
    try {
      if (docId) {
        const opts = await createDocumentsApiOptions();
        const api = createDocumentsApi(opts);
        const download = await api.downloadDocument(docId);
        const url = download.contentUrl ?? download.downloadUrl;
        const resp = await fetch(url, {
          headers: download.contentHeaders ?? {},
        });
        if (resp.ok) {
          const blob = await resp.blob();
          triggerBlobDownload(
            blob,
            download.fileName || `${docTitle || docKey}.pdf`,
          );
          setDownloadMessage(`Documento baixado: ${docTitle}`);
          return;
        }
      }
      // Fallback synthetic download
      triggerSyntheticDownload(sale, docKey, docTitle);
      setDownloadMessage(`Documento baixado: ${docTitle}`);
    } catch {
      triggerSyntheticDownload(sale, docKey, docTitle);
      setDownloadMessage(`Documento baixado: ${docTitle}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    setDownloadMessage(null);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const opts = await createDocumentsApiOptions();
      const api = createDocumentsApi(opts);

      const itemsToDownload =
        documents.length > 0
          ? documents.map((d) => ({
              id: d.id,
              kind: d.kind,
              title: d.title || formatDocumentKindLabel(d.kind),
            }))
          : selectedDocs.map((kind) => ({
              id: undefined,
              kind,
              title: formatDocumentKindLabel(kind),
            }));

      let count = 0;
      for (const item of itemsToDownload) {
        let added = false;
        if (item.id) {
          try {
            const download = await api.downloadDocument(item.id);
            const url = download.contentUrl ?? download.downloadUrl;
            const resp = await fetch(url, {
              headers: download.contentHeaders ?? {},
            });
            if (resp.ok) {
              const blob = await resp.blob();
              zip.file(
                download.fileName || `${item.title || item.kind}.pdf`,
                blob,
              );
              added = true;
              count++;
            }
          } catch {
            added = false;
          }
        }
        if (!added) {
          const content = buildDocumentText(sale, item.kind, item.title);
          zip.file(
            `${item.title || item.kind}.txt`,
            new Blob([content], { type: "text/plain;charset=utf-8" }),
          );
          count++;
        }
      }

      if (count === 0) {
        setDownloadMessage("Nenhum documento disponível para empacotar.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const rawTitle = String(sale.listingSnapshot.title || "venda");
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      triggerBlobDownload(
        zipBlob,
        `documentos-${safeTitle}-${sale.id.slice(0, 8)}.zip`,
      );
      setDownloadMessage(
        "Pacote .ZIP com todos os documentos baixado com sucesso!",
      );
    } catch {
      setDownloadMessage("Erro ao gerar pacote de documentos.");
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
              Venda Concluída & Formalizada
            </span>
            <h3 className="text-lg font-black text-app-text">
              Formalização Finalizada com Sucesso!
            </h3>
            <p className="text-xs font-bold text-muted leading-relaxed mt-1">
              A venda foi fechada no sistema e os documentos jurídicos foram
              gerados. Você pode baixar os arquivos individualmente ou todos
              empacotados em um único arquivo ZIP.
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
              Pronto para Fechar a Venda
            </h3>
            <p className="text-xs font-bold text-muted leading-relaxed mt-1">
              Revise os dados e selecione os documentos. Ao clicar em Fechar
              Venda, todos os documentos oficiais serão gerados para download
              imediato.
            </p>
          </div>
        </div>
      )}

      {/* Download feedback notification */}
      {downloadMessage && (
        <div className="bg-accent/10 border border-accent/30 text-app-text px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="size-4 text-accent shrink-0" />
          <span>{downloadMessage}</span>
        </div>
      )}

      {/* Document Section */}
      <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/45 pb-3">
          <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-4.5 text-accent" />
            <span>Documentos da Formalização</span>
          </h4>

          {/* Download All as ZIP Button */}
          <button
            className="sales-primary-button !min-h-9 !h-9 text-xs font-black flex items-center gap-2"
            disabled={isZipping || selectedDocs.length === 0}
            onClick={() => void handleDownloadAllZip()}
            type="button"
          >
            <div className="gloss-overlay" />
            {isZipping ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FolderArchive className="size-4" />
            )}
            <span>{isZipping ? "Compactando..." : "Baixar Todos (.ZIP)"}</span>
          </button>
        </div>

        {isLoadingDocs ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-bold text-muted">
            <Loader2 className="size-6 animate-spin text-accent" />
            <span>Carregando documentos da venda...</span>
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
                        {isClosed
                          ? "Documento gerado e disponível para download"
                          : "Pronto para emissão no fechamento"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      className="sales-secondary-button !min-h-9 !h-9 text-xs font-black flex items-center gap-1.5"
                      disabled={isDownloadingThis}
                      onClick={() =>
                        void handleDownloadSingle(
                          matchingDoc?.id ?? kind,
                          label,
                          matchingDoc?.id,
                        )
                      }
                      type="button"
                    >
                      {isDownloadingThis ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5 text-accent" />
                      )}
                      <span>
                        {isDownloadingThis ? "Baixando..." : "Baixar PDF"}
                      </span>
                    </button>
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
                  Gere o DANFE e transmita a nota fiscal eletrônica da venda.
                </span>
              </div>
            </div>

            <button
              className="sales-primary-button !min-h-10 !h-10 flex items-center justify-center gap-2 bg-blue-start hover:bg-blue-end text-white text-xs font-black"
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
                className="sales-secondary-button !min-h-10 !h-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-black"
                onClick={onBack}
                type="button"
              >
                <ChevronLeft className="size-4" />
                <span>Lista de Vendas</span>
              </button>
            )}

            {!isClosed && onClose && (
              <button
                className="sales-primary-button !min-h-10 !h-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-black"
                disabled={!canClose || isSaving}
                onClick={onClose}
                style={{
                  opacity: canClose ? 1 : 0.5,
                  cursor: canClose ? "pointer" : "not-allowed",
                }}
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

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function triggerSyntheticDownload(
  sale: SaleRecord,
  docKind: string,
  docTitle: string,
) {
  const content = buildDocumentText(sale, docKind, docTitle);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, `${docTitle || docKind}.txt`);
}

function buildDocumentText(
  sale: SaleRecord,
  docKind: string,
  docTitle: string,
): string {
  const buyerName = String(sale.buyerSnapshot.name || "Não informado");
  const buyerDoc = String(sale.buyerSnapshot.document || "Não informado");
  const vehicleTitle = String(sale.listingSnapshot.title || "Veículo");
  const plate = String(sale.listingSnapshot.plate || "Pendente");
  const price = formatCents(sale.salePriceCents);
  const date = new Date().toLocaleDateString("pt-BR");

  return [
    `=============================================================`,
    ` ${docTitle.toUpperCase()}`,
    `=============================================================`,
    ``,
    `Data de Emissão: ${date}`,
    `Venda ID: ${sale.id}`,
    `Status: ${sale.status.toUpperCase()}`,
    ``,
    `--- DADOS DO COMPRADOR ---`,
    `Nome: ${buyerName}`,
    `CPF/CNPJ: ${buyerDoc}`,
    `Telefone: ${String(sale.buyerSnapshot.phone || "Não informado")}`,
    `E-mail: ${String(sale.buyerSnapshot.email || "Não informado")}`,
    ``,
    `--- DADOS DO VEÍCULO ---`,
    `Modelo: ${vehicleTitle}`,
    `Placa: ${plate}`,
    `Unidade: ${String(sale.listingSnapshot.unitLabel || "Não informado")}`,
    ``,
    `--- VALORES E CONDIÇÕES ---`,
    `Valor Total da Venda: ${price}`,
    `Parcelas Lançadas: ${sale.payments.length}`,
    ...sale.payments.map(
      (p, i) =>
        `  #${i + 1} - ${p.method.toUpperCase()}: ${formatCents(p.principalCents)} (Vencimento: ${p.dueAt || "À vista"})`,
    ),
    ``,
    `Documento emitido eletronicamente pelo Loja Veículos OS.`,
    `=============================================================`,
  ].join("\n");
}
