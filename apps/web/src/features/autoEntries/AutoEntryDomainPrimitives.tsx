import { Save, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../components/ui/FeatureCards";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { cx, type FeatureIcon } from "../../components/ui/featureShared";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { sellerSelectOptions } from "./domainModel";

export function AutoEntryDomainCard({
  children,
  description,
  icon: Icon = SlidersHorizontal,
  title,
  tone = "accent",
}: {
  children: ReactNode;
  description: ReactNode;
  icon?: FeatureIcon;
  title: ReactNode;
  tone?: "accent" | "blue" | "green" | "warning" | "violet" | "neutral";
}) {
  return (
    <FeatureCard className="auto-entry-domain-card" padding="comfortable">
      <FeatureCardHeader
        className="auto-entry-domain-card__header"
        icon={
          <span
            aria-hidden="true"
            className={cx(
              "auto-entry-domain-card__icon",
              tone === "accent" &&
                "bg-accent-soft border-accent/20 text-accent-strong",
              tone === "green" &&
                "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
              tone === "blue" &&
                "bg-blue-soft border-blue-start/20 text-blue-start",
              tone === "warning" &&
                "bg-warning/10 border-warning/20 text-warning-strong",
              tone === "violet" &&
                "bg-violet-500/10 border-violet-500/20 text-violet-start",
              tone === "neutral" && "bg-app-elevated border-line text-muted",
            )}
          >
            <Icon className="size-4" />
          </span>
        }
      >
        <FeatureCardTitle className="auto-entry-domain-card__title">
          {title}
        </FeatureCardTitle>
        <FeatureCardDescription className="mt-1">
          {description}
        </FeatureCardDescription>
      </FeatureCardHeader>
      <div className="auto-entry-domain-card__content">{children}</div>
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
    <FeatureStatusBadge tone={active ? "success" : "warning"}>
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
