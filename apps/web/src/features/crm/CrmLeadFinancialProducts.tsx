import { BadgeDollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { loadSellerOptions } from "../sales/saleContextOptions";
import { CrmSelect } from "./CrmFormControls";
import { createRuntimeProductCrmApi } from "./runtimeApi";
import type { ProductCrmApi } from "./productCrmApi";

type ProductType = "consortium" | "insurance";

export function CrmLeadFinancialProducts({
  api,
  defaultSellerUserId,
  leadId,
}: {
  api?: Pick<ProductCrmApi, "createFinancialProduct">;
  defaultSellerUserId: string | null;
  leadId: string;
}) {
  const productApi = useMemo(() => api ?? createRuntimeProductCrmApi(), [api]);
  const [type, setType] = useState<ProductType>("insurance");
  const [amount, setAmount] = useState("");
  const [insurancePercent, setInsurancePercent] = useState("10");
  const [sellerUserId, setSellerUserId] = useState(defaultSellerUserId ?? "");
  const [sellerOptions, setSellerOptions] = useState<
    readonly { label: string; value: string }[]
  >([]);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const submit = async () => {
    const amountCents = parseAmountCents(amount);
    if (amountCents === null || !sellerUserId) {
      setFeedback(null);
      setError("Informe um valor positivo e o vendedor responsável.");
      return;
    }
    const appliedCommissionBasisPoints = Math.round(
      Number(insurancePercent) * 100,
    );
    if (
      type === "insurance" &&
      (!Number.isFinite(appliedCommissionBasisPoints) ||
        appliedCommissionBasisPoints < 1_000 ||
        appliedCommissionBasisPoints > 2_000)
    ) {
      setFeedback(null);
      setError("A comissão aplicada ao seguro deve ficar entre 10% e 20%.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await productApi.createFinancialProduct(
        leadId,
        type === "insurance"
          ? {
              appliedCommissionBasisPoints,
              idempotencyKey,
              premiumCents: amountCents,
              sellerUserId,
              type,
            }
          : {
              creditLetterAmountCents: amountCents,
              idempotencyKey,
              sellerUserId,
              type,
            },
      );
      setFeedback(
        `${type === "insurance" ? "Seguro" : "Consórcio"} registrado com ${result.entries.length} lançamento(s).`,
      );
      setAmount("");
      setIdempotencyKey(createIdempotencyKey());
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
  };

  return (
    <section className="rounded-xl border border-line/35 bg-panel/10 p-5">
      <div className="mb-4 flex items-start gap-3">
        <BadgeDollarSign
          aria-hidden="true"
          className="mt-0.5 size-5 text-accent"
        />
        <div>
          <h3 className="text-sm font-black text-app-text">
            Produto financeiro contratado
          </h3>
          <p className="mt-1 text-xs font-bold text-muted">
            Registre seguro ou consórcio e gere as comissões padrão da loja e do
            vendedor.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-app-text">Produto</span>
          <CrmSelect<ProductType>
            onChange={setType}
            options={[
              { label: "Seguro", value: "insurance" },
              { label: "Consórcio", value: "consortium" },
            ]}
            value={type}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-app-text">Vendedor</span>
          <CrmSelect
            onChange={setSellerUserId}
            options={sellerOptions}
            placeholder="Selecione o vendedor"
            value={sellerUserId}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-app-text">
            {type === "insurance" ? "Prêmio do seguro" : "Valor da carta"}
          </span>
          <FeatureInput
            min={0.01}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            step={0.01}
            type="number"
            value={amount}
          />
        </label>
        {type === "insurance" ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-black text-app-text">
              Comissão aplicada ao prêmio (%)
            </span>
            <FeatureInput
              max={20}
              min={10}
              onChange={(event) => setInsurancePercent(event.target.value)}
              step={0.01}
              type="number"
              value={insurancePercent}
            />
          </label>
        ) : null}
      </div>
      <div aria-live="polite" className="mt-4 min-h-5 text-xs font-bold">
        {error ? <span className="text-danger">{error}</span> : null}
        {feedback ? <span className="text-success">{feedback}</span> : null}
      </div>
      <div className="mt-3 flex justify-end">
        <FeatureActionButton
          disabled={isSaving}
          icon={BadgeDollarSign}
          label={isSaving ? "Registrando…" : "Registrar produto"}
          onClick={() => void submit()}
        />
      </div>
    </section>
  );
}

function parseAmountCents(value: string): number | null {
  const numberValue = Number(value.replace(",", "."));
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.round(numberValue * 100);
}

function createIdempotencyKey() {
  return crypto.randomUUID();
}
