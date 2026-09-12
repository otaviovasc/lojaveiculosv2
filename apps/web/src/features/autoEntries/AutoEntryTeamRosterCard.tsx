import {
  ChevronRight,
  Landmark,
  Percent,
  Receipt,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../components/ui/FeatureCards";
import { getRoleLabel } from "../settings/settingsLabels";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import {
  familyRules,
  findRule,
  ruleMoneyInput,
  ruleRateInput,
} from "./domainModel";
import { cx } from "../../components/ui/featureShared";
import type { AutoEntryRule } from "./types";

export function AutoEntryTeamRosterCard({
  onSelectSeller,
  rules,
  selectedSellerId,
  sellers,
}: {
  onSelectSeller?: (sellerId: string) => void;
  rules: readonly AutoEntryRule[];
  selectedSellerId?: string;
  sellers: readonly SaleSellerOption[];
}) {
  const sellersWithCustomRules = sellers.filter((seller) => {
    const hasSale = Boolean(
      findRule(rules, "sale.standard_commission", seller.id),
    );
    const hasFinancing =
      familyRules(rules, "financing.seller", seller.id).length > 0;
    const hasTransfer =
      familyRules(rules, "transfer.seller", seller.id).length > 0;
    return hasSale || hasFinancing || hasTransfer;
  });

  return (
    <FeatureCard className="auto-entry-team-roster-card" padding="none">
      <FeatureCardHeader
        className="auto-entry-domain-card__header border-b border-line"
        icon={<Users aria-hidden="true" className="size-6 text-accent" />}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <FeatureCardTitle className="text-base font-extrabold text-text">
              Resumo e Comissões por Vendedor
            </FeatureCardTitle>
            <FeatureCardDescription className="text-xs text-muted mt-0.5">
              Consolidado de comissão de venda, retorno de financiamento e
              faixas de documentação por pessoa da equipe.
            </FeatureCardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app px-2.5 py-1 text-xs font-bold text-muted">
              <UserCheck aria-hidden="true" className="size-3.5 text-accent" />
              {sellers.length}{" "}
              {sellers.length === 1 ? "vendedor" : "vendedores"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-accent-strong">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {sellersWithCustomRules.length} com regras próprias
            </span>
          </div>
        </div>
      </FeatureCardHeader>

      <div className="p-4 md:p-5">
        {sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
            <UserRound
              aria-hidden="true"
              className="size-8 text-muted/50 mb-2"
            />
            <p className="text-sm font-bold text-text">
              Nenhum membro da equipe comissionável encontrado
            </p>
            <p className="text-xs text-muted mt-1 max-w-sm">
              Cadastre vendedores ou supervisores em Equipe para parametrizar
              comissões individuais.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sellers.map((seller) => {
              const saleRule = findRule(
                rules,
                "sale.standard_commission",
                seller.id,
              );
              const financingRules = familyRules(
                rules,
                "financing.seller",
                seller.id,
              );
              const transferRules = familyRules(
                rules,
                "transfer.seller",
                seller.id,
              );
              const extraRules = rules.filter(
                (r) =>
                  (r.family === "sale.extra_commission" ||
                    r.ruleKey === "sale.extra_commission") &&
                  r.recipient?.kind === "fixed_user" &&
                  r.recipient.userId === seller.id,
              );

              const isSelected = selectedSellerId === seller.id;

              const saleCommissionSummary = saleRule
                ? saleRule.calculation.kind === "fixed"
                  ? `R$ ${ruleMoneyInput(saleRule)} fixo por venda`
                  : `${ruleRateInput(saleRule)}% do valor da venda`
                : "Padrão da loja (100% da comissão informada)";

              const financingSummary =
                financingRules.length > 0
                  ? `${financingRules.length} faixas (R1–R5) customizadas`
                  : "Padrão da loja";

              const transferSummary =
                transferRules.length > 0
                  ? `${transferRules.length} faixas de repasse`
                  : "Padrão da loja";

              const initials = seller.label
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  className={cx(
                    "flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200",
                    isSelected
                      ? "border-accent bg-accent-soft/20 shadow-sm"
                      : "border-line bg-panel hover:border-line-strong hover:bg-app-elevated/50",
                  )}
                  key={seller.id}
                >
                  <div className="flex items-start md:items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-app text-xs font-black text-accent-strong">
                      {initials || "VD"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-sm font-extrabold text-text">
                          {seller.label}
                        </strong>
                        <span className="rounded-md border border-line bg-app px-1.5 py-0.5 text-xs font-bold text-muted uppercase tracking-wider">
                          {getRoleLabel(seller.role)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Percent
                            aria-hidden="true"
                            className="size-3 text-accent"
                          />
                          <span className="font-semibold">Venda:</span>{" "}
                          <strong
                            className={
                              saleRule
                                ? "text-accent-strong font-bold"
                                : "text-text font-medium"
                            }
                          >
                            {saleCommissionSummary}
                          </strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Landmark
                            aria-hidden="true"
                            className="size-3 text-accent"
                          />
                          <span className="font-semibold">Financiamento:</span>{" "}
                          <strong
                            className={
                              financingRules.length
                                ? "text-accent-strong font-bold"
                                : "text-text font-medium"
                            }
                          >
                            {financingSummary}
                          </strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <Receipt
                            aria-hidden="true"
                            className="size-3 text-success"
                          />
                          <span className="font-semibold">Documentação:</span>{" "}
                          <strong
                            className={
                              transferRules.length
                                ? "text-success-strong font-bold"
                                : "text-text font-medium"
                            }
                          >
                            {transferSummary}
                          </strong>
                        </span>

                        {extraRules.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-extrabold text-accent-strong">
                            +{extraRules.length} bônus extra
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {onSelectSeller ? (
                    <div className="shrink-0 flex items-center justify-end">
                      <FeatureActionButton
                        icon={ChevronRight}
                        label={isSelected ? "Selecionado" : "Editar comissões"}
                        onClick={() => onSelectSeller(seller.id)}
                        variant={isSelected ? "primary" : "secondary"}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FeatureCard>
  );
}
