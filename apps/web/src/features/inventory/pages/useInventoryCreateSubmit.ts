import type { FormEvent } from "react";
import { useState } from "react";
import type { InventoryApi } from "../api/apiClient";
import {
  retryInventoryCreateMedia,
  submitInventoryCreateFlow,
} from "../model/createInventorySubmit";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryFormState } from "../model/formModel";
import type { InventoryListingDetail } from "../model/types";
import type { CreateFlowSubmitState } from "../components/InventoryCreateFlow";
import { getPublicReadinessIssues } from "../components/InventoryPublicReadiness";

export function useInventoryCreateSubmit({
  form,
  media,
  onCreated,
  resolveApi,
}: {
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
  onCreated: (detail: InventoryListingDetail) => void;
  resolveApi: () => Promise<InventoryApi>;
}) {
  const [submitState, setSubmitState] = useState<CreateFlowSubmitState>({
    kind: "idle",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.status !== "draft") {
      const issues = getPublicReadinessIssues(form, media);
      if (issues.length > 0) {
        setSubmitState({
          kind: "error",
          message: `Salve como rascunho ou corrija: ${issues.join(", ")}.`,
        });
        return;
      }
    }

    setSubmitState({ kind: "submitting", label: "Criando estoque" });

    try {
      const result = await submitInventoryCreateFlow({
        api: await resolveApi(),
        form,
        media,
        onProgress: ({ label }) =>
          setSubmitState({ kind: "submitting", label }),
      });

      onCreated(result.detail);

      if (result.kind === "saved_with_media_failure") {
        setSubmitState({
          failedStep: result.failedStep,
          failedMediaIds: result.failedMediaIds,
          kind: "partial",
          listingId: result.listingId,
          mediaCount: result.mediaCount,
          message: result.message,
        });
        return;
      }

      setSubmitState({
        kind: "success",
        listingId: result.listingId,
        mediaCount: result.mediaCount,
      });
    } catch (error) {
      setSubmitState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleRetryMedia = async () => {
    if (submitState.kind !== "partial") return;

    const partialState = submitState;
    const pendingMedia = media.filter((item) =>
      partialState.failedMediaIds.includes(item.id),
    );

    setSubmitState({ kind: "submitting", label: "Reenviando midias" });

    try {
      const result = await retryInventoryCreateMedia({
        api: await resolveApi(),
        form,
        listingId: partialState.listingId,
        media: pendingMedia,
        onProgress: ({ label }) =>
          setSubmitState({ kind: "submitting", label }),
      });

      onCreated(result.detail);
      setSubmitState({
        kind: "success",
        listingId: result.listingId,
        mediaCount: result.mediaCount,
      });
    } catch (error) {
      setSubmitState({
        ...partialState,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    handleRetryMedia,
    handleSubmit,
    submitState,
  };
}
