import { Landmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ActionDialog } from "./CrmActionDialogFrame";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { loadSellerOptions } from "../sales/saleContextOptions";
import { CrmSelect } from "./CrmFormControls";
import { createRuntimeProductCrmApi } from "./runtimeApi";

type ProductType = "consortium" | "insurance";

export function CrmComposerFinancingDialog({
  disabled,
  leadId,
  onClose,
}: {
  disabled?: boolean;
  leadId: string;
  onClose: () => void;
}) {
  const productApi = useMemo(() => createRuntimeProductCrmApi(), []);
  const [type, setType] = useState<ProductType>("insurance");
  const [amount, setAmount] = useState("");
  const [insurancePercent, setInsurancePercent] = useState("10");
  const [sellerUserId, setSellerUserId] = useState("");
  const [sellerOptions, setSellerOptions] = useState<
    readonly { label: string; value: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadSellerOptions()
      .then((options) => {
        if (!active) return;
        setSellerOptions(
          options.map((option) => ({ label: option.label, value: option.id })),
        );
        setSellerUserId((current) => current || options[0]?.id || "");
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os vendedores.");
      });
    return () => {
      active = false;
    };
  }, []);

  const amountCents = parseAmountCents(amount);
  const canSave =
    amountCents !== null && Boolean(sellerUserId) && !isSaving && !disabled;

  return (
    <ActionDialog
      description="Registre seguro ou consórcio vinculado ao lead e gere as comissões padrão da loja."
      disabled={!canSave}
      icon={<Landmark />}
      onClose={onClose}
      onSubmit={async () => {
        if (!canSave || amountCents === null) return;
        const appliedCommissionBasisPoints = Math.round(
          Number(insurancePercent) * 100,
        );
        if (
          type === "insurance" &&
          (!Number.isFinite(appliedCommissionBasisPoints) ||
            appliedCommissionBasisPoints < 1_000 ||
            appliedCommissionBasisPoints > 2_000)
        ) {
          setError("A comissão aplicada ao seguro deve ficar entre 10% e 20%.");
          return;
        }
        setIsSaving(true);
        setError(null);
        try {
          await productApi.createFinancialProduct(
            leadId,
            type === "insurance"
              ? {
                  appliedCommissionBasisPoints,
                  idempotencyKey: crypto.randomUUID(),
                  premiumCents: amountCents,
                  sellerUserId,
                  type,
                }
              : {
                  creditLetterAmountCents: amountCents,
                  idempotencyKey: crypto.randomUUID(),
                  sellerUserId,
                  type,
                },
          );
          onClose();
        } catch (caught) {
          setError(
            formatApiErrorDisplay(
              caught,
              "Não foi possível registrar o produto financeiro.",
            ),
          );
        } finally {
          setIsSaving(false);
        }
      }}
      submitLabel={isSaving ? "Registrando..." : "Registrar"}
      title="Status financiamento"
    >
      <FeatureField label="Produto">
        <CrmSelect<ProductType>
          disabled={isSaving}
          onChange={setType}
          options={[
            { label: "Seguro", value: "insurance" },
            { label: "Consórcio", value: "consortium" },
          ]}
          value={type}
        />
      </FeatureField>
      <FeatureField label="Vendedor responsável">
        <CrmSelect
          disabled={isSaving}
          onChange={setSellerUserId}
          options={sellerOptions}
          placeholder="Selecione o vendedor"
          value={sellerUserId}
        />
      </FeatureField>
      <FeatureField
        label={type === "insurance" ? "Prêmio do seguro" : "Valor da carta"}
      >
        <FeatureInput
          disabled={isSaving}
          min={0.01}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0,00"
          step={0.01}
          type="number"
          value={amount}
        />
      </FeatureField>
      {type === "insurance" ? (
        <FeatureField label="Comissão aplicada ao prêmio (%)">
          <FeatureInput
            disabled={isSaving}
            max={20}
            min={10}
            onChange={(event) => setInsurancePercent(event.target.value)}
            step={0.01}
            type="number"
            value={insurancePercent}
          />
        </FeatureField>
      ) : null}
      {error ? <p className="crm-action-error">{error}</p> : null}
    </ActionDialog>
  );
}

function parseAmountCents(value: string): number | null {
  const numberValue = Number(value.replace(",", "."));
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue * 100);
}
