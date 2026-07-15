export function aiStudioGenerationResult() {
  return {
    beforeUrl: "https://cdn.local/front.jpg",
    credits: 4,
    generatedStorageKey:
      "tenants/tenant_1/stores/store_1/units/unit_1/ai-studio/output.png",
    generatedUrl: "https://cdn.local/output.png",
    guidance: 0.75,
    mediaId: "media_1",
    model: "flux_2_pro" as const,
    providerGenerationId: "hedra_generation_1",
    sourceStorageKey:
      "tenants/tenant_1/stores/store_1/units/unit_1/photo/front.jpg",
    strength: 0.75,
    templateId: "premium_studio" as const,
    unitId: "unit_1",
  };
}
