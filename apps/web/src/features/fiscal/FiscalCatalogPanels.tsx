import {
  Building2,
  FileText,
  Landmark,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import "../../styles/fiscal-catalog.css";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { Toast } from "../../components/ui/Toast";
import { formatBrazilianDocument } from "../../lib/masks";
import type { FiscalApi } from "./apiClient";
import type { FiscalRecipient, FiscalTemplate } from "./types";

type Props = {
  api: FiscalApi;
  onError: (message: string) => void;
};

type ArchiveTarget =
  | { item: FiscalRecipient; kind: "recipient" }
  | { item: FiscalTemplate; kind: "template" };

const emptyRecipientForm = {
  documentNumber: "",
  documentType: "cnpj" as const,
  legalName: "",
};

const emptyTemplateForm = {
  descriptionTemplate: "",
  name: "",
  recipientId: "",
  serviceNationalCode: "",
  useCase: "financing_commission",
};

export function FiscalCatalogPanels({ api, onError }: Props) {
  const [recipients, setRecipients] = useState<FiscalRecipient[]>([]);
  const [templates, setTemplates] = useState<FiscalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(
    null,
  );
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [recipient, setRecipient] = useState(emptyRecipientForm);
  const [template, setTemplate] = useState(emptyTemplateForm);
  const [toast, setToast] = useState<{ title: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [recipientList, templateList] = await Promise.all([
        api.listRecipients(),
        api.listTemplates(),
      ]);
      setRecipients(recipientList);
      setTemplates(templateList);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha fiscal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createRecipient = async () => {
    setSaving(true);
    try {
      await api.createRecipient(recipient);
      setRecipient(emptyRecipientForm);
      setRecipientDialogOpen(false);
      setToast({ title: "Tomador cadastrado com sucesso." });
      await load();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha fiscal.");
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = async () => {
    setSaving(true);
    try {
      await api.createTemplate({
        ...template,
        recipientId: template.recipientId || null,
      });
      setTemplate(emptyTemplateForm);
      setTemplateDialogOpen(false);
      setToast({ title: "Modelo NFS-e cadastrado com sucesso." });
      await load();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha fiscal.");
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      if (archiveTarget.kind === "recipient") {
        await api.archiveRecipient(archiveTarget.item.id);
        setToast({ title: "Tomador removido do catálogo." });
      } else {
        await api.archiveTemplate(archiveTarget.item.id);
        setToast({ title: "Modelo removido do catálogo." });
      }
      setArchiveTarget(null);
      await load();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha fiscal.");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="fiscal-catalog">
      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone="success"
        />
      ) : null}
      <div className="fiscal-catalog-grid">
        <CatalogPanel
          actions={
            <>
              <FeatureActionButton
                icon={RefreshCcw}
                isBusy={loading}
                label="Atualizar"
                onClick={() => void load()}
                title="Atualizar tomadores e modelos"
              />
              <FeatureActionButton
                icon={Plus}
                label="Novo tomador"
                onClick={() => setRecipientDialogOpen(true)}
                title="Cadastrar financeira / tomador"
                variant="primary"
              />
            </>
          }
          count={recipients.length}
          description="Financeiras e tomadores de serviço que recebem as NFS-e emitidas pela loja."
          eyebrow="Tomadores"
          icon={<Landmark aria-hidden="true" className="size-4" />}
          title="Financeiras / Tomadores"
          watermark={<Landmark aria-hidden="true" />}
        >
          {loading ? (
            <CatalogSkeleton rows={2} />
          ) : recipients.length === 0 ? (
            <CatalogEmpty
              copy="Cadastre a financeira ou tomador para vincular às notas fiscais de comissão."
              icon={<Landmark aria-hidden="true" className="size-5" />}
              title="Nenhum tomador cadastrado."
            />
          ) : (
            <ul className="fiscal-catalog-list">
              {recipients.map((item) => (
                <li className="fiscal-catalog-row" key={item.id}>
                  <span aria-hidden="true" className="fiscal-catalog-avatar">
                    {initialsOf(item.legalName)}
                  </span>
                  <div className="fiscal-catalog-row__info">
                    <strong>{item.legalName}</strong>
                    <span>
                      {item.documentType.toUpperCase()} · {item.documentNumber}
                    </span>
                  </div>
                  <FeatureStatusBadge
                    size="dense"
                    tone={item.isActive ? "success" : "neutral"}
                  >
                    {item.isActive ? "Ativo" : "Inativo"}
                  </FeatureStatusBadge>
                  <button
                    aria-label={`Excluir tomador ${item.legalName}`}
                    className="fiscal-catalog-icon-action"
                    onClick={() =>
                      setArchiveTarget({ item, kind: "recipient" })
                    }
                    title="Excluir tomador"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CatalogPanel>

        <CatalogPanel
          actions={
            <FeatureActionButton
              icon={Plus}
              label="Novo modelo"
              onClick={() => setTemplateDialogOpen(true)}
              title="Cadastrar modelo NFS-e"
              variant="primary"
            />
          }
          count={templates.length}
          description="Modelos de descrição e código de serviço usados na emissão das NFS-e."
          eyebrow="Modelos"
          icon={<FileText aria-hidden="true" className="size-4" />}
          title="Modelos NFS-e"
          watermark={<FileText aria-hidden="true" />}
        >
          {loading ? (
            <CatalogSkeleton rows={2} />
          ) : templates.length === 0 ? (
            <CatalogEmpty
              copy="Crie um modelo com o código nacional do serviço e a descrição que sai na nota."
              icon={<FileText aria-hidden="true" className="size-5" />}
              title="Nenhum modelo NFS-e cadastrado."
            />
          ) : (
            <ul className="fiscal-catalog-list">
              {templates.map((item) => (
                <li className="fiscal-catalog-row" key={item.id}>
                  <span
                    aria-hidden="true"
                    className="fiscal-catalog-avatar fiscal-catalog-avatar--blue"
                  >
                    {initialsOf(item.name)}
                  </span>
                  <div className="fiscal-catalog-row__info">
                    <strong>{item.name}</strong>
                    <span>
                      Serviço {item.serviceNationalCode || "—"} · v
                      {item.version}
                    </span>
                  </div>
                  <FeatureStatusBadge
                    size="dense"
                    tone={item.isActive ? "blue" : "neutral"}
                  >
                    {item.isActive ? `v${item.version}` : "Inativo"}
                  </FeatureStatusBadge>
                  <button
                    aria-label={`Excluir modelo ${item.name}`}
                    className="fiscal-catalog-icon-action"
                    onClick={() => setArchiveTarget({ item, kind: "template" })}
                    title="Excluir modelo"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CatalogPanel>
      </div>

      <FeatureDialog
        description="Informe a razão social e o documento da financeira ou tomador de serviço."
        footer={
          <FeatureDialogActions
            confirmDisabled={!recipient.legalName || !recipient.documentNumber}
            confirmLabel="Salvar tomador"
            isLoading={saving}
            onCancel={() => setRecipientDialogOpen(false)}
            onConfirm={() => void createRecipient()}
          />
        }
        icon={<Building2 aria-hidden="true" />}
        isOpen={recipientDialogOpen}
        onClose={() => setRecipientDialogOpen(false)}
        title="Novo tomador"
      >
        <div className="fiscal-catalog-form">
          <label className="fiscal-catalog-field">
            <span>Nome do tomador</span>
            <FeatureInput
              aria-label="Nome do tomador"
              onChange={(event) =>
                setRecipient({ ...recipient, legalName: event.target.value })
              }
              placeholder="Financeira / Tomador"
              value={recipient.legalName}
            />
          </label>
          <label className="fiscal-catalog-field">
            <span>CNPJ ou CPF</span>
            <FeatureInput
              aria-label="CNPJ ou CPF do tomador"
              inputMode="numeric"
              onChange={(event) =>
                setRecipient({
                  ...recipient,
                  documentNumber: formatBrazilianDocument(event.target.value),
                })
              }
              placeholder="CNPJ ou CPF"
              value={recipient.documentNumber}
            />
          </label>
        </div>
      </FeatureDialog>

      <FeatureDialog
        description="Defina o tipo de comissão, o código nacional do serviço e a descrição que vai sair na nota."
        footer={
          <FeatureDialogActions
            confirmDisabled={!template.name || !template.serviceNationalCode}
            confirmLabel="Salvar modelo"
            isLoading={saving}
            onCancel={() => setTemplateDialogOpen(false)}
            onConfirm={() => void createTemplate()}
          />
        }
        icon={<FileText aria-hidden="true" />}
        isOpen={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        title="Novo modelo NFS-e"
      >
        <div className="fiscal-catalog-form">
          <label className="fiscal-catalog-field">
            <span>Nome do modelo</span>
            <FeatureInput
              aria-label="Nome do modelo"
              onChange={(event) =>
                setTemplate({ ...template, name: event.target.value })
              }
              placeholder="Tipo de comissão"
              value={template.name}
            />
          </label>
          <label className="fiscal-catalog-field">
            <span>Código do serviço</span>
            <FeatureInput
              aria-label="Codigo nacional do serviço"
              onChange={(event) =>
                setTemplate({
                  ...template,
                  serviceNationalCode: event.target.value,
                })
              }
              placeholder="Código do serviço"
              value={template.serviceNationalCode}
            />
          </label>
          <label className="fiscal-catalog-field">
            <span>Descrição na nota</span>
            <FeatureTextarea
              aria-label="Descrição que vai sair na nota"
              onChange={(event) =>
                setTemplate({
                  ...template,
                  descriptionTemplate: event.target.value,
                })
              }
              placeholder="Descrição que vai sair na nota"
              value={template.descriptionTemplate}
            />
          </label>
        </div>
      </FeatureDialog>

      <FeatureDialog
        footer={
          <FeatureDialogActions
            confirmLabel="Excluir"
            isLoading={archiving}
            loadingLabel="Excluindo"
            onCancel={() => setArchiveTarget(null)}
            onConfirm={() => void confirmArchive()}
            variant="danger"
          />
        }
        icon={<Trash2 aria-hidden="true" />}
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={
          archiveTarget?.kind === "template"
            ? "Excluir modelo NFS-e"
            : "Excluir tomador"
        }
      >
        <p className="text-sm font-bold text-muted">
          {archiveTarget?.kind === "template"
            ? `O modelo "${archiveTarget.item.name}" será removido do catálogo. Documentos já emitidos não são alterados.`
            : archiveTarget
              ? `O tomador "${archiveTarget.item.legalName}" será removido do catálogo. Documentos já emitidos não são alterados.`
              : null}
        </p>
      </FeatureDialog>
    </div>
  );
}

function CatalogPanel({
  actions,
  children,
  count,
  description,
  eyebrow,
  icon,
  title,
  watermark,
}: {
  actions?: React.ReactNode;
  children: React.ReactNode;
  count: number;
  description: string;
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  watermark: React.ReactNode;
}) {
  return (
    <section className="fiscal-catalog-panel">
      <span aria-hidden="true" className="fiscal-catalog-panel__watermark">
        {watermark}
      </span>
      <header className="fiscal-catalog-panel__header">
        <div className="fiscal-catalog-panel__heading">
          <span className="fiscal-catalog-panel__eyebrow">
            {icon}
            {eyebrow}
          </span>
          <div className="fiscal-catalog-panel__title-row">
            <h3>{title}</h3>
            <span className="fiscal-catalog-panel__count">{count}</span>
          </div>
          <p>{description}</p>
        </div>
        {actions ? (
          <div className="fiscal-catalog-panel__actions">{actions}</div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function CatalogEmpty({
  copy,
  icon,
  title,
}: {
  copy: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="fiscal-catalog-empty">
      <span aria-hidden="true" className="fiscal-catalog-empty__chip">
        {icon}
      </span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function CatalogSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="fiscal-catalog-list">
      {Array.from({ length: rows }, (_, index) => (
        <div
          className="fiscal-catalog-row fiscal-catalog-row--skeleton"
          key={index}
        >
          <span className="fiscal-catalog-avatar fiscal-catalog-shimmer" />
          <div className="fiscal-catalog-row__info">
            <span className="fiscal-catalog-shimmer fiscal-catalog-shimmer--line" />
            <span className="fiscal-catalog-shimmer fiscal-catalog-shimmer--line fiscal-catalog-shimmer--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0]?.charAt(0) ?? "";
  const last =
    parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
