import { inventoryRoutes } from "./apiRoutes";
import type { SendJson } from "./inventoryMediaApi";
import type { InventoryListingDetail } from "../model/types";
import type {
  AiStudioGenerationResult,
  ApproveAiStudioImageInput,
  GenerateAiStudioImageInput,
} from "../model/aiStudioTypes";

export type InventoryAiStudioApi = ReturnType<
  typeof createInventoryAiStudioApi
>;

export function createInventoryAiStudioApi({
  baseUrl,
  postJson,
}: {
  baseUrl?: string;
  postJson: SendJson;
}) {
  const generateAiStudioImage = (
    unitId: string,
    input: GenerateAiStudioImageInput,
  ) =>
    postJson<AiStudioGenerationResult>(
      inventoryRoutes.aiStudioGenerations(unitId, baseUrl),
      {
        mediaId: input.mediaId,
        templateId: input.templateId,
      },
    );

  const approveAiStudioImage = (
    unitId: string,
    input: ApproveAiStudioImageInput,
  ) =>
    postJson<InventoryListingDetail>(
      inventoryRoutes.aiStudioApprovals(unitId, baseUrl),
      {
        generatedStorageKey: input.generatedStorageKey,
        mediaId: input.mediaId,
        templateId: input.templateId,
      },
    );

  return { approveAiStudioImage, generateAiStudioImage };
}
