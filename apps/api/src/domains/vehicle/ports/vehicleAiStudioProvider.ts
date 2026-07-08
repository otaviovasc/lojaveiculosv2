export type VehicleAiStudioTemplateId =
  "industrial_garage" | "premium_studio" | "urban_scene";

export type VehicleAiStudioGenerationMode = "image-to-image/inpainting";

export type GenerateVehicleAiStudioProviderInput = {
  guidance: number;
  mode: VehicleAiStudioGenerationMode;
  model: "flux_2_pro";
  prompt: string;
  sourceImageUrl: string;
  strength: number;
  templateId: VehicleAiStudioTemplateId;
};

export type GeneratedVehicleAiStudioImage = {
  bytes: Uint8Array;
  contentType: string;
  providerGenerationId?: string | null;
  providerImageUrl?: string | null;
};

export type VehicleAiStudioProviderPhase =
  | "asset-create"
  | "asset-list"
  | "asset-upload"
  | "download"
  | "generation"
  | "source-download"
  | "status";

export type VehicleAiStudioProviderErrorDetails = {
  errorName?: string;
  phase?: VehicleAiStudioProviderPhase;
  provider: "hedra";
  providerAssetId?: string;
  providerGenerationId?: string;
  providerGenerationStatus?: string;
  providerProgress?: number;
  providerResponseBody?: string;
  providerResponseContentType?: string;
  providerStatus?: number;
  providerStatusText?: string;
  timeoutMs?: number;
  urlHost?: string;
  urlPath?: string;
};

export type VehicleAiStudioProvider = {
  generateImage: (
    input: GenerateVehicleAiStudioProviderInput,
  ) => Promise<GeneratedVehicleAiStudioImage>;
};

export class VehicleAiStudioProviderError extends Error {
  readonly statusCode: 502 | 503;

  constructor(
    message: string,
    statusCode: 502 | 503 = 503,
    readonly details?: VehicleAiStudioProviderErrorDetails,
  ) {
    super(message);
    this.name = "VehicleAiStudioProviderError";
    this.statusCode = statusCode;
  }
}
