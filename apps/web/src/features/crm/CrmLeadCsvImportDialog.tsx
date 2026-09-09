import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { parseCrmLeadCsv, type CrmCsvRow } from "./crmLeadCsvImport";
import type { CrmLeadImportInput, CrmLeadImportResult } from "./productCrmApi";
import type { PipelineStage } from "./crmPipelineStorage";

export type CrmLeadCsvImportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  stages: PipelineStage[];
  initialStageId?: string | undefined;
  onImport: (input: CrmLeadImportInput) => Promise<CrmLeadImportResult>;
  onSuccess?: (() => void) | undefined;
};

function generateIdempotencyKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `import_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CrmLeadCsvImportDialog({
  isOpen,
  onClose,
  stages,
  initialStageId,
  onImport,
  onSuccess,
}: CrmLeadCsvImportDialogProps) {
  const fileInputId = useId();
  const readGeneration = useRef(0);
  const [stageId, setStageId] = useState<string>(
    () => initialStageId ?? stages[0]?.id ?? "",
  );
  const [fileName, setFileName] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CrmCsvRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CrmLeadImportResult | null>(
    null,
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    generateIdempotencyKey(),
  );

  const validRows = useMemo(
    () => parsedRows.filter((r) => r.errors.length === 0),
    [parsedRows],
  );
  const invalidRows = useMemo(
    () => parsedRows.filter((r) => r.errors.length > 0),
    [parsedRows],
  );

  const handleStageChange = (newStageId: string) => {
    if (isSubmitting || isParsing) return;
    setStageId(newStageId);
    setIdempotencyKey(generateIdempotencyKey());
    setSubmitError(null);
    setImportResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting) return;
    const currentGen = ++readGeneration.current;
    const file = e.target.files?.[0];

    // Immediately clear parsed rows and previous errors to avoid race conditions
    setParsedRows([]);
    setParseError(null);
    setSubmitError(null);
    setImportResult(null);

    if (!file) {
      setFileName("");
      setIsParsing(false);
      return;
    }

    setFileName(file.name);
    setIdempotencyKey(generateIdempotencyKey());

    if (file.size > 2_000_000) {
      setParseError("O CSV deve ter até 2 MB.");
      setIsParsing(false);
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      if (currentGen !== readGeneration.current) return;
      const rows = parseCrmLeadCsv(text);
      if (currentGen !== readGeneration.current) return;
      setParsedRows(rows);
    } catch (caught) {
      if (currentGen !== readGeneration.current) return;
      setParseError(
        caught instanceof Error ? caught.message : "Erro ao processar CSV.",
      );
      setParsedRows([]);
    } finally {
      if (currentGen === readGeneration.current) {
        setIsParsing(false);
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isParsing || validRows.length === 0 || !stageId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await onImport({
        idempotencyKey,
        pipelineStageId: stageId,
        rows: validRows.map((r) => r.value),
      });

      setImportResult(result);
      if (result.created > 0) {
        onSuccess?.();
      }
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "Falha na comunicação com o servidor ao importar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    idempotencyKey,
    isParsing,
    isSubmitting,
    onImport,
    onSuccess,
    stageId,
    validRows,
  ]);

  const handleClose = () => {
    if (isSubmitting) return;
    readGeneration.current++;
    setIsParsing(false);
    setFileName("");
    setParseError(null);
    setParsedRows([]);
    setSubmitError(null);
    setImportResult(null);
    onClose();
  };

  const stageOptions = useMemo(
    () =>
      stages.map((s) => ({
        label: s.name,
        value: s.id,
      })),
    [stages],
  );

  return (
    <FeatureDialog
      footer={
        <FeatureDialogActions
          confirmDisabled={
            isSubmitting || isParsing || validRows.length === 0 || !stageId
          }
          confirmLabel={
            isParsing
              ? "Lendo CSV..."
              : submitError
                ? "Tentar novamente"
                : "Importar contatos válidos"
          }
          isLoading={isSubmitting}
          loadingLabel="Importando contatos..."
          onCancel={handleClose}
          onConfirm={() => void handleSubmit()}
        />
      }
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Leads via CSV"
    >
      <div className="flex flex-col gap-4 text-app-text">
        {/* Stage selection */}
        <FeatureField label="Etapa de destino">
          <FeatureSelect
            ariaLabel="Etapa de destino"
            density="compact"
            disabled={isSubmitting || isParsing}
            onChange={(val) => handleStageChange(val)}
            options={stageOptions}
            value={stageId}
          />
        </FeatureField>

        {/* File upload */}
        <FeatureField label="Arquivo CSV (máx 500 linhas / 2 MB)">
          <div className="flex flex-col gap-2">
            <label
              className={
                "flex flex-col items-center justify-center p-4 border border-dashed rounded-xl transition-colors cursor-pointer relative " +
                "focus-within:ring-2 focus-within:ring-accent focus-within:border-accent " +
                (isSubmitting || isParsing
                  ? "opacity-50 cursor-not-allowed border-line/40"
                  : "border-line/60 hover:border-accent/60 bg-panel/30 hover:bg-panel/50")
              }
              htmlFor={fileInputId}
            >
              <Upload className="size-6 text-muted mb-1.5" />
              <span className="text-xs font-black text-app-text">
                {fileName ? fileName : "Clique para selecionar o arquivo CSV"}
              </span>
              <span className="text-xs font-bold text-muted mt-0.5">
                Colunas esperadas: nome e telefone ou e-mail
              </span>
              <input
                accept=".csv,text/csv"
                aria-label="Selecionar arquivo CSV"
                className="sr-only"
                disabled={isSubmitting}
                id={fileInputId}
                onChange={(e) => void handleFileChange(e)}
                type="file"
              />
            </label>
          </div>
        </FeatureField>

        {/* Parsing state */}
        {isParsing && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-line/40 bg-panel/20 text-xs font-bold text-muted">
            <LoaderCircle className="size-4 animate-spin text-accent" />
            <span>Processando arquivo CSV...</span>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <FeatureAlert icon={<AlertCircle className="size-4" />} tone="danger">
            {parseError}
          </FeatureAlert>
        )}

        {/* Rows preview */}
        {parsedRows.length > 0 && !parseError && (
          <div className="flex flex-col gap-3 rounded-xl border border-line/40 bg-panel/20 p-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted flex items-center gap-1.5">
                <FileSpreadsheet className="size-4 text-muted" />
                <span>{parsedRows.length} linhas analisadas</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-success-strong/10 text-success-strong text-xs font-black">
                  {validRows.length} válidas
                </span>
                {invalidRows.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-danger/10 text-danger text-xs font-black">
                    {invalidRows.length} com erros
                  </span>
                )}
              </div>
            </div>

            {/* Invalid rows warning */}
            {invalidRows.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-line/20 pt-2">
                <span className="text-xs font-black text-danger">
                  Linhas que não serão importadas:
                </span>
                <div className="max-h-28 overflow-y-auto flex flex-col gap-1 text-xs">
                  {invalidRows.map((row) => (
                    <div
                      className="text-muted text-xs flex items-center gap-1.5"
                      key={row.line}
                    >
                      <span className="font-black text-app-text">
                        Linha {row.line}:
                      </span>
                      <span>{row.errors.join("; ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <FeatureAlert
            icon={<AlertCircle className="size-4" />}
            title="Falha ao importar contatos"
            tone="danger"
          >
            {submitError}
          </FeatureAlert>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="flex flex-col gap-2 rounded-xl border border-line/40 bg-panel/30 p-3.5 text-xs">
            <div className="flex items-center gap-2 font-black text-app-text">
              {importResult.created > 0 ? (
                <CheckCircle2 className="size-4 text-success-strong" />
              ) : (
                <AlertCircle className="size-4 text-warning-strong" />
              )}
              <span>Resultado da importação</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1 text-center font-bold">
              <div className="p-2 rounded bg-success-strong/10 border border-success-strong/20">
                <div className="text-sm font-black text-success-strong">
                  {importResult.created}
                </div>
                <div className="text-xs text-muted">Criados</div>
              </div>
              <div className="p-2 rounded bg-line/15 border border-line/30">
                <div className="text-sm font-black text-app-text">
                  {importResult.skipped}
                </div>
                <div className="text-xs text-muted">Ignorados</div>
              </div>
              <div className="p-2 rounded bg-danger/10 border border-danger/20">
                <div className="text-sm font-black text-danger">
                  {importResult.errors.length}
                </div>
                <div className="text-xs text-muted">Erros</div>
              </div>
            </div>

            {/* Server row errors mapped to original CSV line (1-based backend index) */}
            {importResult.errors.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-xs font-black text-danger">
                  Erros retornados pelo servidor:
                </span>
                <div className="max-h-28 overflow-y-auto flex flex-col gap-1">
                  {importResult.errors.map((err, idx) => {
                    const originalLine =
                      validRows[err.row - 1]?.line ?? err.row;
                    return (
                      <div
                        className="text-xs text-muted"
                        key={`${err.row}_${idx}`}
                      >
                        <span className="font-black text-app-text">
                          Linha {originalLine}:
                        </span>{" "}
                        {err.message}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FeatureDialog>
  );
}
