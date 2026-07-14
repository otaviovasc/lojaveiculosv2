import { Landmark, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { SaleField } from "./SaleWorkspaceForm";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { formatIsoDate, parseIsoDate } from "./salesDateFormat";
import { SalePercentageInput } from "./SalePercentageInput";
import { snapshotNumber } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";
import { saleFinancingRanks } from "./types";

export function FinancingPanel({
  financing,
  onChange,
}: {
  financing: SnapshotRecord;
  onChange: ServiceChangeHandler;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PanelHeader icon={<Landmark className="size-4.5 text-accent" />}>
        Dados do Financiamento
      </PanelHeader>

      <SaleField label="Banco / Financeira">
        <input
          className="sales-input"
          onChange={(event) =>
            onChange("financing", "bankName", event.target.value)
          }
          placeholder="Ex: Santander, BV, Itaú..."
          value={String(financing.bankName ?? "")}
        />
      </SaleField>

      <CurrencyField
        label="Valor Financiado"
        onChange={(value) =>
          onChange("financing", "financedAmountCents", value)
        }
        value={snapshotNumber(financing.financedAmountCents)}
      />

      <SaleField label="Classificação do Financiamento">
        <FeatureSelect
          ariaLabel="Classificação do financiamento"
          className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
          onChange={(value) => onChange("financing", "rank", value)}
          options={saleFinancingRanks.map((rank) => ({
            label: rank,
            value: rank,
          }))}
          value={String(financing.rank ?? "R1")}
        />
      </SaleField>

      <SaleField label="Número de Parcelas">
        <input
          className="sales-input"
          onChange={(event) =>
            onChange(
              "financing",
              "installmentsCount",
              event.target.value ? parseInt(event.target.value, 10) : null,
            )
          }
          min={1}
          placeholder="Ex: 48, 60"
          type="number"
          value={
            financing.installmentsCount !== undefined
              ? String(financing.installmentsCount)
              : ""
          }
        />
      </SaleField>

      <CurrencyField
        label="Valor da Parcela"
        onChange={(value) =>
          onChange("financing", "installmentAmountCents", value)
        }
        value={snapshotNumber(financing.installmentAmountCents)}
      />

      <SaleField label="Taxa de Juros A.M. (%)">
        <SalePercentageInput
          className="sales-input"
          onValueChange={(value) =>
            onChange("financing", "interestRatePercentage", value)
          }
          placeholder="Ex: 1.49"
          value={snapshotNumber(financing.interestRatePercentage)}
        />
      </SaleField>

      <SaleField label="Status do Financiamento">
        <FeatureSelect
          className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
          onChange={(value) => onChange("financing", "status", value)}
          options={[
            { value: "pending", label: "Aguardando Aprovação" },
            { value: "approved", label: "Aprovado / Faturado" },
            { value: "rejected", label: "Reprovado" },
          ]}
          value={String(financing.status ?? "pending")}
        />
      </SaleField>
    </div>
  );
}

export function InsurancePanel({
  insurance,
  onChange,
}: {
  insurance: SnapshotRecord;
  onChange: ServiceChangeHandler;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PanelHeader icon={<ShieldCheck className="size-4.5 text-accent" />}>
        Dados de Seguro e Proteção
      </PanelHeader>

      <SaleField label="Seguradora / Associação">
        <input
          className="sales-input"
          onChange={(event) =>
            onChange("insurance", "companyName", event.target.value)
          }
          placeholder="Ex: Porto Seguro, Allianz, Azul..."
          value={String(insurance.companyName ?? "")}
        />
      </SaleField>

      <SaleField label="Corretora / Consultor">
        <input
          className="sales-input"
          onChange={(event) =>
            onChange("insurance", "brokerName", event.target.value)
          }
          placeholder="Ex: Alfa Seguros"
          value={String(insurance.brokerName ?? "")}
        />
      </SaleField>

      <CurrencyField
        label="Valor do Prêmio / Apólice"
        onChange={(value) => onChange("insurance", "premiumCents", value)}
        value={snapshotNumber(insurance.premiumCents)}
      />

      <SaleField label="Comissão Aplicada sobre o Prêmio (%)">
        <SalePercentageInput
          className="sales-input"
          onValueChange={(value) =>
            onChange("insurance", "appliedCommissionPercentage", value)
          }
          placeholder="Entre 10 e 20"
          value={snapshotNumber(insurance.appliedCommissionPercentage) ?? 10}
        />
      </SaleField>

      <SaleField label="Vigência Apólice (Até)">
        <DatePickerField
          label="Até"
          onChange={(date) =>
            onChange("insurance", "validUntil", formatIsoDate(date))
          }
          value={parseIsoDate(insurance.validUntil)}
        />
      </SaleField>

      <div className="md:col-span-2">
        <SaleField label="Status do Seguro">
          <FeatureSelect
            className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
            onChange={(value) => onChange("insurance", "status", value)}
            options={[
              { value: "pending", label: "Cotação Pendente" },
              { value: "issued", label: "Apólice Emitida" },
              { value: "cancelled", label: "Cancelado" },
            ]}
            value={String(insurance.status ?? "pending")}
          />
        </SaleField>
      </div>
    </div>
  );
}

function CurrencyField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number | null) => void;
  value: number | null | undefined;
}) {
  return (
    <SaleField label={label}>
      <input
        className="sales-input"
        onChange={(event) => onChange(parseCurrency(event.target.value))}
        placeholder="R$ 0,00"
        value={formatCurrency(value)}
      />
    </SaleField>
  );
}

function PanelHeader({
  children,
  icon,
}: {
  children: string;
  icon: ReactNode;
}) {
  return (
    <div className="md:col-span-2 border-b border-line pb-2 mb-1">
      <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        <span>{children}</span>
      </h4>
    </div>
  );
}
