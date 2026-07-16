import { Plus, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { formatBrazilianDocument } from "../../lib/masks";
import type { FiscalApi } from "./apiClient";
import type { FiscalRecipient, FiscalTemplate } from "./types";

type Props = {
  api: FiscalApi;
  onError: (message: string) => void;
};

export function FiscalCatalogPanels({ api, onError }: Props) {
  const [recipients, setRecipients] = useState<FiscalRecipient[]>([]);
  const [templates, setTemplates] = useState<FiscalTemplate[]>([]);
  const [recipient, setRecipient] = useState({
    documentNumber: "",
    documentType: "cnpj" as const,
    legalName: "",
  });
  const [template, setTemplate] = useState({
    descriptionTemplate: "",
    name: "",
    recipientId: "",
    serviceNationalCode: "",
    useCase: "financing_commission",
  });

  const load = async () => {
    try {
      const [recipientList, templateList] = await Promise.all([
        api.listRecipients(),
        api.listTemplates(),
      ]);
      setRecipients(recipientList);
      setTemplates(templateList);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha fiscal.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createRecipient = async () => {
    await api.createRecipient(recipient);
    setRecipient({ documentNumber: "", documentType: "cnpj", legalName: "" });
    await load();
  };

  const createTemplate = async () => {
    await api.createTemplate({
      ...template,
      recipientId: template.recipientId || null,
    });
    setTemplate({
      descriptionTemplate: "",
      name: "",
      recipientId: "",
      serviceNationalCode: "",
      useCase: "financing_commission",
    });
    await load();
  };

  return (
    <>
      <FeatureSection
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void load()}
            title="Atualizar tomadores e modelos"
          />
        }
        className="feature-panel"
        title="Financeiras / Tomadores"
      >
        <div className="feature-form-row">
          <input
            aria-label="Nome do tomador"
            onChange={(event) =>
              setRecipient({ ...recipient, legalName: event.target.value })
            }
            placeholder="Financeira / Tomador"
            value={recipient.legalName}
          />
          <input
            aria-label="CNPJ ou CPF do tomador"
            onChange={(event) =>
              setRecipient({
                ...recipient,
                documentNumber: formatBrazilianDocument(event.target.value),
              })
            }
            inputMode="numeric"
            placeholder="CNPJ ou CPF"
            value={recipient.documentNumber}
          />
          <button onClick={() => void createRecipient()} type="button">
            <Plus aria-hidden="true" className="size-4" />
            Salvar
          </button>
        </div>
        <CompactList
          empty="Nenhum tomador cadastrado."
          items={recipients.map((item) => item.legalName)}
        />
      </FeatureSection>

      <FeatureSection className="feature-panel" title="Modelos NFS-e">
        <div className="feature-form-row">
          <input
            aria-label="Nome do modelo"
            onChange={(event) =>
              setTemplate({ ...template, name: event.target.value })
            }
            placeholder="Tipo de comissão"
            value={template.name}
          />
          <input
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
          <button onClick={() => void createTemplate()} type="button">
            <Plus aria-hidden="true" className="size-4" />
            Salvar
          </button>
        </div>
        <textarea
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
        <CompactList
          empty="Nenhum modelo NFS-e cadastrado."
          items={templates.map((item) => `${item.name} v${item.version}`)}
        />
      </FeatureSection>
    </>
  );
}

function CompactList({ empty, items }: { empty: string; items: string[] }) {
  return items.length ? (
    <div className="feature-list">
      {items.map((item) => (
        <article key={item}>
          <strong>{item}</strong>
        </article>
      ))}
    </div>
  ) : (
    <p>{empty}</p>
  );
}
