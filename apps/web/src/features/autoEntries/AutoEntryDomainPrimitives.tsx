import { Save } from "lucide-react";
import type { ReactNode } from "react";
import {
  FeatureCard,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../components/ui/FeatureCards";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { sellerSelectOptions } from "./domainModel";

export function AutoEntryDomainCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <FeatureCard padding="compact">
      <FeatureCardHeader>
        <FeatureCardTitle>{title}</FeatureCardTitle>
        <p className="mt-1 text-sm font-bold text-muted">{description}</p>
      </FeatureCardHeader>
      <div className="mt-5 grid gap-4">{children}</div>
    </FeatureCard>
  );
}

export function AutoEntrySaveAction({
  canManage,
  isSaving,
  label = "Salvar configuração",
  onClick,
}: {
  canManage: boolean;
  isSaving: boolean;
  label?: string;
  onClick: () => void;
}) {
  if (!canManage) return null;
  return (
    <div className="flex justify-end border-t border-line/50 pt-4">
      <FeatureActionButton
        icon={Save}
        isBusy={isSaving}
        label={label}
        onClick={onClick}
        variant="primary"
      />
    </div>
  );
}

export function AutoEntrySellerField({
  error,
  onChange,
  sellers,
  value,
}: {
  error?: string;
  onChange: (sellerUserId: string) => void;
  sellers: readonly SaleSellerOption[];
  value: string;
}) {
  return (
    <FeatureField
      error={error}
      hint="A regra só se aplica quando este vendedor estiver no evento de origem."
      label="Vendedor da origem"
    >
      <FeatureSelect
        ariaLabel="Vendedor da origem"
        onChange={onChange}
        options={sellerSelectOptions(sellers)}
        placeholder="Selecione um vendedor"
        value={value || undefined}
      />
    </FeatureField>
  );
}

export function AutoEntryValueOrigin({ active }: { active: boolean }) {
  return (
    <FeatureStatusBadge tone={active ? "success" : "neutral"}>
      {active ? "Regra ativa" : "Sugestão não salva"}
    </FeatureStatusBadge>
  );
}

export function AutoEntryInlineError({ message }: { message: string | null }) {
  return message ? (
    <p className="text-sm font-black text-danger" role="alert">
      {message}
    </p>
  ) : null;
}
