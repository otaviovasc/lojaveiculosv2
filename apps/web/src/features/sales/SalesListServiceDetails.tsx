import {
  FileText,
  Landmark,
  Percent,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatCents } from "./salesModel";
import {
  asSnapshotRecord,
  snapshotBoolean,
  snapshotNumber,
} from "./salesSnapshot";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";

type ServiceType =
  "commission" | "documentation" | "financing" | "insurance" | "tradeIn";

export function SaleServicesDetails({ sale }: { sale: SaleRecord }) {
  return (
    <div className="bg-app-elevated/10 border border-line/40 rounded-2xl p-4 flex flex-col gap-3">
      <h4 className="text-xs font-black text-app-text uppercase tracking-wider border-b border-line/35 pb-2 flex items-center gap-1.5">
        <Sparkles className="size-4.5 text-accent" />
        <span>Serviços Contratados e Comissão</span>
      </h4>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs font-bold">
        <ServiceSummary
          icon={<Landmark className="size-3.5 text-accent" />}
          sale={sale}
          type="financing"
        />
        <ServiceSummary
          icon={<ShieldCheck className="size-3.5 text-accent" />}
          sale={sale}
          type="insurance"
        />
        <ServiceSummary
          icon={<FileText className="size-3.5 text-accent" />}
          sale={sale}
          type="documentation"
        />
        <ServiceSummary
          icon={<Percent className="size-3.5 text-accent" />}
          sale={sale}
          type="commission"
        />
        <ServiceSummary
          icon={<RefreshCw className="size-3.5 text-accent" />}
          sale={sale}
          type="tradeIn"
        />
      </div>
    </div>
  );
}

function ServiceSummary({
  icon,
  sale,
  type,
}: {
  icon: ReactNode;
  sale: SaleRecord;
  type: ServiceType;
}) {
  const value = asSnapshotRecord(sale.saleSourceSnapshot[type]);
  return (
    <div className="p-3 bg-panel rounded-xl border border-line/50">
      <span className="text-xs text-muted uppercase font-bold flex items-center gap-1 mb-1.5">
        {icon} {serviceLabel(type)}
      </span>
      <ServiceContent type={type} value={value} />
    </div>
  );
}

function ServiceContent({
  type,
  value,
}: {
  type: ServiceType;
  value: SnapshotRecord;
}) {
  if (type === "tradeIn" && !snapshotBoolean(value.enabled)) {
    return (
      <span className="text-xs text-muted block italic">Não contratado</span>
    );
  }
  if (type === "financing" && !value.bankName) {
    return (
      <span className="text-xs text-muted block italic">Não contratado</span>
    );
  }
  if (type === "insurance" && !value.companyName) {
    return (
      <span className="text-xs text-muted block italic">Não contratado</span>
    );
  }
  if (
    type === "documentation" &&
    (!snapshotNumber(value.chargedAmountCents) || value.status !== "charged")
  ) {
    return (
      <span className="text-xs text-muted block italic">Não contratado</span>
    );
  }
  if (type === "commission" && !snapshotBoolean(value.enabled)) {
    return (
      <span className="text-xs text-muted block italic">Não contratado</span>
    );
  }

  if (type === "commission") return <CommissionSummary value={value} />;
  if (type === "documentation") {
    return <DocumentationSummary value={value} />;
  }
  if (type === "tradeIn") return <TradeInSummary value={value} />;
  return <PolicySummary type={type} value={value} />;
}

function DocumentationSummary({ value }: { value: SnapshotRecord }) {
  const chargedAmountCents = snapshotNumber(value.chargedAmountCents);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-accent-strong">
        {formatCents(chargedAmountCents ?? 0)}
      </span>
      <span className="text-muted">
        {value.hasLien === true
          ? "Com alienação"
          : value.hasLien === false
            ? "Sem alienação"
            : "Alienação não informada"}
      </span>
    </div>
  );
}

function CommissionSummary({ value }: { value: SnapshotRecord }) {
  const amountValueCents = snapshotNumber(value.amountValueCents);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-app-text">
        Tipo: {value.ruleType === "fixed" ? "Fixo" : "Percentual"}
      </span>
      <span className="text-success-strong">
        {value.ruleType === "fixed"
          ? formatCents(amountValueCents ?? 0)
          : `${String(value.percentageRate ?? "")}%`}
      </span>
    </div>
  );
}

function TradeInSummary({ value }: { value: SnapshotRecord }) {
  const valuationCents = snapshotNumber(value.valuationCents);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-app-text block truncate uppercase">
        {String(value.brand ?? "")} {String(value.model ?? "")}
      </span>
      <span className="text-accent-strong">
        {valuationCents ? formatCents(valuationCents) : ""}
      </span>
      <span className="text-xs text-success-strong uppercase font-black">
        Cadastro Auto
      </span>
    </div>
  );
}

function PolicySummary({
  type,
  value,
}: {
  type: "financing" | "insurance";
  value: SnapshotRecord;
}) {
  const amountCents =
    type === "financing"
      ? snapshotNumber(value.financedAmountCents)
      : snapshotNumber(value.premiumCents);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-app-text uppercase">
        {type === "financing"
          ? String(value.bankName ?? "")
          : String(value.companyName ?? "")}
      </span>
      <span className="text-accent-strong">
        {formatCents(amountCents ?? 0)}
      </span>
      <span className="text-xs text-muted">
        {type === "financing"
          ? `${String(value.installmentsCount ?? "")} parcelas`
          : `Broker: ${String(value.brokerName ?? "")}`}
      </span>
    </div>
  );
}

function serviceLabel(type: ServiceType) {
  if (type === "financing") return "Financiamento";
  if (type === "insurance") return "Seguro";
  if (type === "documentation") return "Documentação";
  if (type === "commission") return "Comissão";
  return "Veículo na Troca";
}
