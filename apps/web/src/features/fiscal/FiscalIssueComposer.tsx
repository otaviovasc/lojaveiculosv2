import { Eye, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import type {
  FiscalRecipient,
  FiscalTemplate,
  IssueFiscalDocumentInput,
} from "./types";

type Props = {
  api: FiscalApi;
  disabled: boolean;
  onError: (message: string) => void;
  onIssued: () => Promise<void>;
};

export function FiscalIssueComposer({
  api,
  disabled,
  onError,
  onIssued,
}: Props) {
  const [kind, setKind] = useState<"nfe" | "nfse">("nfse");
  const [reference, setReference] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [competence, setCompetence] = useState(defaultCompetence());
  const [recipients, setRecipients] = useState<FiscalRecipient[]>([]);
  const [templates, setTemplates] = useState<FiscalTemplate[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([api.listRecipients(), api.listTemplates()])
      .then(([recipientList, templateList]) => {
        setRecipients(recipientList);
        setTemplates(templateList);
      })
      .catch((error) => onError(errorMessage(error)));
  }, [api, onError]);

  const selectedRecipient = recipients.find((item) => item.id === recipientId);
  const amount = amountFrom(grossAmount);
  const canIssue = kind === "nfe" || (templateId && amount > 0);
  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (item) =>
          !recipientId || !item.recipientId || item.recipientId === recipientId,
      ),
    [recipientId, templates],
  );

  async function previewTemplate() {
    if (!templateId) return;
    setBusy(true);
    try {
      const result = await api.previewTemplate({
        templateId,
        variables: createTemplateVariables(
          amount,
          competence,
          selectedRecipient,
        ),
      });
      setPreview(result.renderedDescription);
      setUnresolved(result.unresolvedVariables);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    setBusy(true);
    try {
      const input: IssueFiscalDocumentInput = {
        documentKind: kind,
        documentType:
          kind === "nfse" ? "nfse_service_commission" : "nfe_vehicle_sale",
        externalReference: reference || `manual-${kind}`,
        metadata: {
          competence,
          grossAmount: amount,
        },
        recipientId: recipientId || null,
        templateId: kind === "nfse" ? templateId || null : null,
      };
      if (kind === "nfse") {
        input.templateVariables = createTemplateVariables(
          amount,
          competence,
          selectedRecipient,
        );
      }
      await api.issueDocument(input);
      setPreview(null);
      setReference("");
      await onIssued();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FeatureSection className="feature-panel" title="Emitir documento">
      <div className="feature-form-row">
        <FeatureSelect
          ariaLabel="Tipo de nota"
          onChange={setKind}
          options={[
            { label: "Nova NFS-e", value: "nfse" },
            { label: "Nova NF-e", value: "nfe" },
          ]}
          value={kind}
        />
        <input
          aria-label="Referencia externa"
          onChange={(event) => setReference(event.target.value)}
          placeholder="Venda, lead ou lancamento"
          value={reference}
        />
        <input
          aria-label="Valor da comissão"
          inputMode="decimal"
          onChange={(event) => setGrossAmount(event.target.value)}
          placeholder="Valor da comissão"
          value={grossAmount}
        />
        <input
          aria-label="Competencia"
          onChange={(event) => setCompetence(event.target.value)}
          type="month"
          value={competence}
        />
      </div>
      {kind === "nfse" ? (
        <div className="feature-form-row">
          <FeatureSelect
            ariaLabel="Financeira / Tomador"
            onChange={setRecipientId}
            options={[
              { label: "Financeira / Tomador", value: "" },
              ...recipients.map((recipient) => ({
                label: recipient.legalName,
                value: recipient.id,
              })),
            ]}
            value={recipientId}
          />
          <FeatureSelect
            ariaLabel="Tipo de comissão"
            onChange={setTemplateId}
            options={[
              { label: "Tipo de comissão", value: "" },
              ...visibleTemplates.map((template) => ({
                label: `${template.name} v${template.version}`,
                value: template.id,
              })),
            ]}
            value={templateId}
          />
          <button
            disabled={!templateId || disabled || busy}
            onClick={() => void previewTemplate()}
            type="button"
          >
            <Eye aria-hidden="true" className="size-4" />
            Preview
          </button>
        </div>
      ) : null}
      {preview ? (
        <FeatureAlert>
          {preview}
          {unresolved.length ? ` | Faltam: ${unresolved.join(", ")}` : ""}
        </FeatureAlert>
      ) : null}
      <button
        disabled={disabled || busy || !canIssue}
        onClick={() => void issue()}
        type="button"
      >
        <Send aria-hidden="true" className="size-4" />
        Emitir
      </button>
    </FeatureSection>
  );
}

function createTemplateVariables(
  amount: number,
  competence: string,
  recipient: FiscalRecipient | undefined,
) {
  const [year, month] = competence.split("-");
  return {
    invoice: {
      competenceMonth: month,
      competenceYear: year,
      grossAmount: amount,
      irrfAmount: 0,
      issAmount: 0,
      netAmount: amount,
    },
    recipient: {
      document: recipient?.documentNumber,
      legalName: recipient?.legalName,
    },
    sale: {
      commissionAmount: amount,
      periodReference: `${month}/${year}`,
    },
  };
}

function defaultCompetence() {
  return new Date().toISOString().slice(0, 7);
}

function amountFrom(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(error, "Nao foi possivel emitir a nota.");
}
