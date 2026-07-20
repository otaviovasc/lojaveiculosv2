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
import type { AutoEntryTone } from "./domainMeta";
import { sellerSelectOptions } from "./domainModel";

export function AutoEntryDomainCard({
  children,
  description,
  icon: Icon = SlidersHorizontal,
  title,
  tone,
}: {
  children: ReactNode;
  description: ReactNode;
  icon?: FeatureIcon;
  title: ReactNode;
  /** Overrides the origin colour; when omitted the card inherits the panel tone. */
  tone?: AutoEntryTone;
}) {
  return (
    <FeatureCard
      className={cx("auto-entry-domain-card", tone && `ae-tone--${tone}`)}
      padding="none"
    >
      <FeatureCardHeader
        className="auto-entry-domain-card__header"
        icon={
          <span aria-hidden="true" className="auto-entry-domain-card__icon">
            <Icon className="size-4" />
          </span>
        }
      >
        <FeatureCardTitle className="auto-entry-domain-card__title">
          {title}
        </FeatureCardTitle>
        <FeatureCardDescription className="auto-entry-domain-card__description mt-1">
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
    <div className="auto-entry-domain-card__save flex justify-end border-t border-line/50 pt-4">
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

/** Tone-tinted tile for a single read-only value inside a domain card. */
export function AutoEntryStat({
  className,
  hint,
  icon: Icon,
  label,
  value,
}: {
  className?: string;
  hint?: ReactNode;
  icon?: FeatureIcon;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className={cx("ae-stat", className)}>
      {Icon ? (
        <span aria-hidden="true" className="ae-stat__icon">
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="ae-stat__body">
        <span className="ae-stat__label">{label}</span>
        <span className="ae-stat__value">{value}</span>
        {hint ? <span className="ae-stat__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

/** Icon + label/value line used inside rule rows (lighter than a stat tile). */
export function AutoEntryFact({
  icon: Icon,
  label,
  value,
}: {
  icon: FeatureIcon;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="ae-fact">
      <Icon aria-hidden="true" className="ae-fact__icon size-4" />
      <div className="min-w-0">
        <span className="ae-stat__label">{label}</span>
        <span className="ae-stat__value">{value}</span>
      </div>
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
