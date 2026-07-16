import { Car, FileSpreadsheet, User } from "lucide-react";
import type { ReactNode } from "react";
import { formatBrazilianDocument } from "../../lib/masks";
import { SaleField } from "./SaleWorkspaceForm";
import type { SaleRecord } from "./types";
import type { RequiredFieldsPolicy } from "./validation";

type ValidationErrors = Record<string, string>;

export function BuyerDocumentationFields({
  buyer,
  errors,
  onChange,
  policy,
}: {
  buyer: SaleRecord["buyerSnapshot"];
  errors: ValidationErrors;
  onChange: (key: string, value: string) => void;
  policy: RequiredFieldsPolicy;
}) {
  return (
    <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <PanelTitle icon={<User className="size-4.5 text-accent" />}>
        Dados de Documentação do Comprador
      </PanelTitle>

      <DocumentInput
        error={errors.buyerDocument}
        label={`CPF / CNPJ ${policy.buyerDocument ? "*" : ""}`}
        onChange={(value) =>
          onChange("document", formatBrazilianDocument(value))
        }
        placeholder="Digite apenas números"
        value={formatBrazilianDocument(
          String(buyer.document || buyer.cpf || ""),
        )}
      />
      <DocumentInput
        error={errors.buyerAddress}
        label={`Endereço Completo (Rua, nº, Bairro) ${policy.buyerAddress ? "*" : ""}`}
        onChange={(value) => onChange("address", value)}
        placeholder="Rua, número, complemento e bairro"
        value={String(buyer.address || "")}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <DocumentInput
            error={errors.buyerCity}
            label={`Cidade ${policy.buyerCityState ? "*" : ""}`}
            onChange={(value) => onChange("city", value)}
            placeholder="Nome da cidade"
            value={String(buyer.city || "")}
          />
        </div>
        <DocumentInput
          className="uppercase"
          error={errors.buyerState}
          label={`Estado ${policy.buyerCityState ? "*" : ""}`}
          maxLength={2}
          onChange={(value) => onChange("state", value)}
          placeholder="UF"
          value={String(buyer.state || "")}
        />
      </div>

      {(policy.buyerNacionalidade ||
        policy.buyerEstadoCivil ||
        policy.buyerProfissao) && (
        <div className="flex flex-col gap-4 bg-app-elevated/10 p-3 rounded-xl border border-line/40 mt-1">
          <span className="text-xs font-black text-accent-strong uppercase tracking-widest block border-b border-line/30 pb-1.5">
            Exigido para Procuração:
          </span>
          <DocumentInput
            error={errors.buyerNacionalidade}
            label="Nacionalidade *"
            onChange={(value) => onChange("nacionalidade", value)}
            placeholder="Ex: Brasileiro(a)"
            value={String(buyer.nacionalidade || "")}
          />
          <DocumentInput
            error={errors.buyerEstadoCivil}
            label="Estado Civil *"
            onChange={(value) => onChange("estadoCivil", value)}
            placeholder="Ex: Casado(a), Solteiro(a)..."
            value={String(buyer.estadoCivil || "")}
          />
          <DocumentInput
            error={errors.buyerProfissao}
            label="Profissão *"
            onChange={(value) => onChange("profissao", value)}
            placeholder="Ex: Advogado(a), Engenheiro(a)..."
            value={String(buyer.profissao || "")}
          />
        </div>
      )}
    </div>
  );
}

export function VehicleDocumentationFields({
  emitirNFe,
  errors,
  listing,
  onChange,
  policy,
}: {
  emitirNFe: boolean;
  errors: ValidationErrors;
  listing: SaleRecord["listingSnapshot"];
  onChange: (key: string, value: string) => void;
  policy: RequiredFieldsPolicy;
}) {
  return (
    <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <PanelTitle icon={<Car className="size-4.5 text-accent" />}>
        Dados de Documentação do Veículo
      </PanelTitle>

      <DocumentInput
        error={errors.vehicleRenavam}
        label={`Renavam ${policy.vehicleRenavam ? "*" : ""}`}
        maxLength={11}
        onChange={(value) => onChange("renavam", value)}
        placeholder="Digite apenas números (11 dígitos)"
        value={String(listing.renavam || "")}
      />
      <DocumentInput
        className="uppercase"
        error={errors.vehicleChassi}
        label={`Chassi * ${policy.vehicleChassi ? "(Obrigatório)" : "(Opcional)"}`}
        maxLength={17}
        onChange={(value) => onChange("chassi", value)}
        placeholder="Ex: 17 caracteres do chassi"
        value={String(listing.chassi || "")}
      />

      {emitirNFe && (
        <div className="flex flex-col gap-4 bg-app-elevated/10 p-3 rounded-xl border border-line/40 mt-1">
          <span className="text-xs font-black text-accent-strong uppercase tracking-widest block border-b border-line/30 pb-1.5 flex items-center gap-1">
            <FileSpreadsheet className="size-3.5" /> Exigido para Emissão Fiscal
            (NF-e):
          </span>

          <div className="grid grid-cols-2 gap-3">
            <DocumentInput
              error={errors.vehiclePotencia}
              label="Potência (CV) *"
              onChange={(value) => onChange("potencia", value)}
              placeholder="Ex: 150"
              value={String(listing.potencia || "")}
            />
            <DocumentInput
              error={errors.vehicleCilindrada}
              label="Cilindrada (CC) *"
              onChange={(value) => onChange("cilindrada", value)}
              placeholder="Ex: 2000"
              value={String(listing.cilindrada || "")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DocumentInput
              error={errors.vehiclePesoLiquido}
              label="Peso Líquido (KG) *"
              onChange={(value) => onChange("peso_liquido", value)}
              placeholder="Ex: 1300"
              value={String(listing.peso_liquido || "")}
            />
            <DocumentInput
              error={errors.vehiclePesoBruto}
              label="Peso Bruto (KG) *"
              onChange={(value) => onChange("peso_bruto", value)}
              placeholder="Ex: 1750"
              value={String(listing.peso_bruto || "")}
            />
          </div>

          <DocumentInput
            error={errors.vehicleNumeroMotor}
            label="Número do Motor *"
            onChange={(value) => onChange("numero_motor", value)}
            placeholder="Ex: Número gravado no bloco"
            value={String(listing.numero_motor || "")}
          />
        </div>
      )}
    </div>
  );
}

function DocumentInput({
  className = "",
  error,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  error: string | undefined;
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <SaleField label={label}>
      <input
        className={[
          "sales-input",
          className,
          error ? "border-danger/50 focus:border-danger" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <FieldError error={error} />
    </SaleField>
  );
}

function FieldError({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <span className="text-xs font-bold text-danger mt-1 uppercase">
      {error}
    </span>
  );
}

function PanelTitle({ children, icon }: { children: string; icon: ReactNode }) {
  return (
    <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5 border-b border-line/45 pb-3">
      {icon}
      <span>{children}</span>
    </h4>
  );
}
