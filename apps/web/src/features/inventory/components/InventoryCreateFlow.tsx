import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import type {
  InventoryFieldChangeHandler,
  InventoryFormState,
} from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryRouteState } from "../model/inventoryRouteState";
import { InventoryCreateMediaPanel } from "./InventoryCreateMediaPanel";
import { InventoryPublicReadiness } from "./InventoryPublicReadiness";
import { ListingPanel, UnitPanel } from "./InventoryListingPanels";
import {
  canAdvanceStep,
  CreateNavigation,
  CreateStepper,
  CreateSubmitPanel,
  createFlowSteps,
  ModePanel,
} from "./InventoryCreateFlowParts";

export type CreateFlowMode = "quick" | "detailed" | "draft";
export type CreateFlowSubmitState =
  | { kind: "idle" }
  | { kind: "submitting"; label: string }
  | { kind: "success"; listingId: string; mediaCount: number }
  | {
      failedMediaIds: readonly string[];
      failedStep: "media" | "unit";
      kind: "partial";
      listingId: string;
      mediaCount: number;
      message: string;
    }
  | { kind: "error"; message: string };

export function InventoryCreateFlow({
  api,
  form,
  initialStep = "mode",
  media,
  onCatalogChange,
  onChange,
  onMediaChange,
  onModeChange,
  onRetryMedia,
  onSubmit,
  state,
}: {
  api: InventoryApi | null;
  form: InventoryFormState;
  initialStep?: InventoryRouteState["createStep"];
  media: readonly CreateMediaDraft[];
  onCatalogChange: (catalog: InventoryFormState["catalog"]) => void;
  onChange: InventoryFieldChangeHandler;
  onMediaChange: (items: CreateMediaDraft[]) => void;
  onModeChange?: (mode: CreateFlowMode) => void;
  onRetryMedia: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  state: CreateFlowSubmitState;
}) {
  const [mode, setMode] = useState<CreateFlowMode>("quick");
  const [step, setStep] = useState(() => createStepIndex(initialStep));
  const activeStep = createFlowSteps[step] ?? "Modo";
  const canAdvance = useMemo(
    () => canAdvanceStep(activeStep, form, mode),
    [activeStep, form, mode],
  );

  return (
    <form
      className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"
      onSubmit={(event) => void onSubmit(event)}
    >
      <div className="grid gap-4">
        <CreateStepper step={step} />
        {activeStep === "Modo" ? (
          <ModePanel
            mode={mode}
            onChange={(nextMode) => {
              setMode(nextMode);
              onModeChange?.(nextMode);
            }}
          />
        ) : null}
        {activeStep === "Catalogo" ? (
          <ListingPanel
            api={api}
            form={form}
            onCatalogChange={onCatalogChange}
            onChange={onChange}
          />
        ) : null}
        {activeStep === "Midia" ? (
          <InventoryCreateMediaPanel items={media} onChange={onMediaChange} />
        ) : null}
        {activeStep === "Dados" ? (
          <UnitPanel form={form} onChange={onChange} />
        ) : null}
        {activeStep === "Revisao" ? (
          <InventoryPublicReadiness form={form} media={media} />
        ) : null}
      </div>

      <div className="grid content-start gap-4">
        <InventoryPublicReadiness form={form} media={media} />
        <CreateSubmitPanel
          media={media}
          onRetryMedia={onRetryMedia}
          state={state}
          status={form.status}
        />
        <CreateNavigation
          canAdvance={canAdvance}
          isFirst={step === 0}
          isLast={step === createFlowSteps.length - 1}
          onBack={() => setStep((current) => Math.max(0, current - 1))}
          onNext={() =>
            setStep((current) =>
              Math.min(createFlowSteps.length - 1, current + 1),
            )
          }
          submitting={state.kind === "submitting"}
        />
      </div>
    </form>
  );
}

function createStepIndex(step: InventoryRouteState["createStep"]) {
  if (step === "catalog") return 1;
  if (step === "media") return 2;
  if (step === "data") return 3;
  if (step === "review") return 4;
  return 0;
}
