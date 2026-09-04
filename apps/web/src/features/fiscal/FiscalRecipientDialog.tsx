import { Building2 } from "lucide-react";
import { useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { lookupBrazilianZipCode } from "../../lib/cepLookup";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";
import type { FiscalRecipient } from "./types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: Partial<FiscalRecipient>) => Promise<void>;
  saving: boolean;
};

const emptyRecipientForm = {
  city: "",
  cityCode: "",
  complement: "",
  district: "",
  documentNumber: "",
  email: "",
  legalName: "",
  number: "",
  phone: "",
  postalCode: "",
  state: "",
  street: "",
};

export function FiscalRecipientDialog({
  isOpen,
  onClose,
  onSubmit,
  saving,
}: Props) {
  const [recipient, setRecipient] = useState(emptyRecipientForm);

  const update = (patch: Partial<typeof emptyRecipientForm>) =>
    setRecipient((current) => ({ ...current, ...patch }));

  const fillAddressFromZipCode = async (postalCode: string) => {
    const found = await lookupBrazilianZipCode(postalCode);
    if (!found) return;
    setRecipient((current) => ({
      ...current,
      city: found.city || current.city,
      district: found.neighborhood || current.district,
      state: found.state || current.state,
      street: found.street || current.street,
    }));
  };

  const submit = async () => {
    const addressEntries = (
      [
        ["city", recipient.city],
        ["cityCode", recipient.cityCode.replace(/\D/g, "")],
        ["complement", recipient.complement],
        ["district", recipient.district],
        ["number", recipient.number],
        ["postalCode", recipient.postalCode.replace(/\D/g, "")],
        ["state", recipient.state.trim().toUpperCase()],
        ["street", recipient.street],
      ] as const
    )
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value !== "");
    await onSubmit({
      address: Object.fromEntries(addressEntries),
      documentNumber: recipient.documentNumber,
      documentType: "cnpj",
      email: recipient.email.trim() || null,
      legalName: recipient.legalName,
      phone: recipient.phone.trim() || null,
    });
    setRecipient(emptyRecipientForm);
  };

  return (
    <FeatureDialog
      description="Informe os dados da financeira ou tomador de serviço. O endereço é usado na NFS-e."
      footer={
        <FeatureDialogActions
          confirmDisabled={!recipient.legalName || !recipient.documentNumber}
          confirmLabel="Salvar tomador"
          isLoading={saving}
          onCancel={onClose}
          onConfirm={() => void submit()}
        />
      }
      icon={<Building2 aria-hidden="true" />}
      isOpen={isOpen}
      onClose={onClose}
      title="Novo tomador"
    >
      <div className="fiscal-catalog-form">
        <label className="fiscal-catalog-field">
          <span>Nome do tomador</span>
          <FeatureInput
            aria-label="Nome do tomador"
            onChange={(event) => update({ legalName: event.target.value })}
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
              update({
                documentNumber: formatBrazilianDocument(event.target.value),
              })
            }
            placeholder="CNPJ ou CPF"
            value={recipient.documentNumber}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>E-mail</span>
          <FeatureInput
            aria-label="E-mail do tomador"
            inputMode="email"
            onChange={(event) => update({ email: event.target.value })}
            placeholder="E-mail (opcional)"
            value={recipient.email}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Telefone</span>
          <FeatureInput
            aria-label="Telefone do tomador"
            inputMode="tel"
            onChange={(event) =>
              update({ phone: formatBrazilianPhone(event.target.value) })
            }
            placeholder="Telefone (opcional)"
            value={recipient.phone}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>CEP</span>
          <FeatureInput
            aria-label="CEP do tomador"
            inputMode="numeric"
            onChange={(event) => {
              const postalCode = formatBrazilianZipCode(event.target.value);
              update({ postalCode });
              if (postalCode.replace(/\D/g, "").length === 8) {
                void fillAddressFromZipCode(postalCode);
              }
            }}
            placeholder="CEP (opcional)"
            value={recipient.postalCode}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Logradouro</span>
          <FeatureInput
            aria-label="Logradouro do tomador"
            onChange={(event) => update({ street: event.target.value })}
            placeholder="Rua / Avenida"
            value={recipient.street}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Número</span>
          <FeatureInput
            aria-label="Número do endereço do tomador"
            onChange={(event) => update({ number: event.target.value })}
            placeholder="Número"
            value={recipient.number}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Complemento</span>
          <FeatureInput
            aria-label="Complemento do endereço do tomador"
            onChange={(event) => update({ complement: event.target.value })}
            placeholder="Complemento (opcional)"
            value={recipient.complement}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Bairro</span>
          <FeatureInput
            aria-label="Bairro do tomador"
            onChange={(event) => update({ district: event.target.value })}
            placeholder="Bairro"
            value={recipient.district}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Cidade</span>
          <FeatureInput
            aria-label="Cidade do tomador"
            onChange={(event) => update({ city: event.target.value })}
            placeholder="Cidade"
            value={recipient.city}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>UF</span>
          <FeatureInput
            aria-label="UF do tomador"
            maxLength={2}
            onChange={(event) =>
              update({ state: event.target.value.toUpperCase() })
            }
            placeholder="UF"
            value={recipient.state}
          />
        </label>
        <label className="fiscal-catalog-field">
          <span>Código IBGE do município</span>
          <FeatureInput
            aria-label="Código IBGE do município do tomador"
            inputMode="numeric"
            onChange={(event) =>
              update({ cityCode: event.target.value.replace(/\D/g, "") })
            }
            placeholder="Código IBGE (7 dígitos)"
            value={recipient.cityCode}
          />
        </label>
      </div>
    </FeatureDialog>
  );
}
