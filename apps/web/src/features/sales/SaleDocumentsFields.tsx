import { Car, FileSpreadsheet, LoaderCircle, MapPin, User } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatBrazilianDocument,
  formatBrazilianZipCode,
  formatVehicleRenavamInput,
  formatVehicleVinInput,
} from "../../lib/masks";
import { lookupBrazilianZipCode } from "../../lib/cepLookup";
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
  const [cep, setCep] = useState(String(buyer.postalCode || buyer.cep || ""));
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepSearch = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;
    setIsSearchingCep(true);
    setCepError(null);
    try {
      const addressData = await lookupBrazilianZipCode(cleanCep);
      if (addressData) {
        const formattedZip = formatBrazilianZipCode(cleanCep);
        onChange("postalCode", formattedZip);
        onChange("cep", formattedZip);
        if (addressData.street) onChange("address", addressData.street);
        if (addressData.neighborhood)
          onChange("district", addressData.neighborhood);
        if (addressData.city) onChange("city", addressData.city);
        if (addressData.state) onChange("state", addressData.state);
      } else {
        setCepError("CEP não encontrado");
      }
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setIsSearchingCep(false);
    }
  };

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <PanelTitle icon={<User className="size-4.5 text-accent" />}>
        Dados de Documentação do Comprador
      </PanelTitle>

      <DocumentInput
        error={errors.buyerDocument}
        formatter={formatBrazilianDocument}
        label={`CPF / CNPJ ${policy.buyerDocument ? "*" : ""}`}
        onChange={(value) =>
          onChange("document", formatBrazilianDocument(value))
        }
        placeholder="Digite apenas números"
        value={formatBrazilianDocument(
          String(buyer.document || buyer.cpf || ""),
        )}
      />

      <div className="flex flex-col gap-1">
        <SaleField label="CEP">
          <div className="relative flex items-center">
            <input
              className="sales-input pr-10"
              maxLength={9}
              onBlur={(e) => {
                void handleCepSearch(e.target.value);
              }}
              onChange={(e) => {
                const formatted = formatBrazilianZipCode(e.target.value);
                setCep(formatted);
                if (formatted.replace(/\D/g, "").length === 8) {
                  void handleCepSearch(formatted);
                }
              }}
              placeholder="00000-000"
              value={cep}
            />
            <div className="absolute right-3 text-muted">
              {isSearchingCep ? (
                <LoaderCircle className="size-4 animate-spin text-accent" />
              ) : (
                <MapPin className="size-4 text-muted/60" />
              )}
            </div>
          </div>
          {cepError ? (
            <span className="text-xs font-bold text-danger mt-1 uppercase">
              {cepError}
            </span>
          ) : null}
        </SaleField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DocumentInput
          error={errors.buyerAddress}
          label={`Logradouro / Rua e Número ${policy.buyerAddress ? "*" : ""}`}
          onChange={(value) => onChange("address", value)}
          placeholder="Ex: Av. Paulista, 1000, Apto 42"
          value={String(buyer.address || "")}
        />
        <DocumentInput
          label="Bairro"
          onChange={(value) => onChange("district", value)}
          placeholder="Ex: Bela Vista"
          value={String(buyer.district || buyer.bairro || "")}
        />
      </div>

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
          onChange={(value) => onChange("state", value.toUpperCase())}
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
        formatter={formatVehicleRenavamInput}
        label={`Renavam ${policy.vehicleRenavam ? "*" : ""}`}
        maxLength={11}
        onChange={(value) => onChange("renavam", value)}
        placeholder="Digite apenas números (11 dígitos)"
        value={String(listing.renavam || "")}
      />
      <DocumentInput
        className="uppercase"
        error={errors.vehicleChassi}
        formatter={formatVehicleVinInput}
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
  formatter,
  label,
  maxLength,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  error?: string | undefined;
  formatter?: (value: string) => string;
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [touched, setTouched] = useState(false);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleBlur = () => {
    isFocusedRef.current = false;
    setTouched(true);
    const finalVal = formatter ? formatter(localValue) : localValue;
    setLocalValue(finalVal);
    if (finalVal !== value) {
      onChange(finalVal);
    }
  };

  const showError = touched && Boolean(error);

  return (
    <SaleField label={label}>
      <input
        className={[
          "sales-input",
          className,
          showError ? "border-danger/50 focus:border-danger" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        maxLength={maxLength}
        onBlur={handleBlur}
        onChange={(event) => {
          const nextVal = formatter
            ? formatter(event.target.value)
            : event.target.value;
          setLocalValue(nextVal);
        }}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        value={localValue}
      />
      {showError ? <FieldError error={error} /> : null}
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
