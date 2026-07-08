import type { VehicleAiStudioTemplateId } from "./ports/vehicleAiStudioProvider.js";

export type VehicleAiStudioTemplate = {
  id: VehicleAiStudioTemplateId;
  label: string;
  prompt: string;
};

const preserveVehiclePrompt =
  "STRICT BACKGROUND REPLACEMENT / COMPOSITING TASK. The vehicle in the source photo is not to be generated, redesigned, beautified, cleaned, repaired, repainted, relit, sharpened, upscaled, stylized, or changed. Treat the entire vehicle as a protected frozen foreground layer copied from the source image: preserve every pixel inside the full car silhouette and edge boundary, including body shape, scale, proportions, paint color, reflections on paint and glass, trim, headlights, grille, bumpers, wheels, tires, tire tread, windows, mirrors, badges, license plate area, stickers, decals, dents, dirt, scratches, visible wear, interior glimpses, crop, camera angle, focal length, perspective, and position in frame. Do not invent a cleaner or different version of the car. Do not alter the vehicle lighting or reflections on the vehicle surface. Only replace pixels outside the vehicle silhouette with a new environment. If any instruction conflicts with preserving the exact original car, preserving the car wins. Add only natural contact shadows and ground reflections outside the vehicle boundary so the unchanged car fits the new background.";

export const vehicleAiStudioTemplates = [
  {
    id: "premium_studio",
    label: "Estúdio Premium",
    prompt: `${preserveVehiclePrompt} Replace the background with a modern minimalist dealership showroom, white and grey epoxy floor, clean architectural walls, premium softbox lighting, luxury commercial automotive atmosphere, high-end dealership presentation.`,
  },
  {
    id: "industrial_garage",
    label: "Garagem Industrial",
    prompt: `${preserveVehiclePrompt} Replace the background with a sleek modern industrial garage, polished dark concrete floor, clean background walls, subtle neon accent lights behind the vehicle, controlled cinematic ambience, professional dealership inventory presentation.`,
  },
  {
    id: "urban_scene",
    label: "Cenário Urbano",
    prompt: `${preserveVehiclePrompt} Replace the background with a clean empty asphalt road during golden hour, softly blurred premium urban scenery in the distance, warm natural light in the environment, professional commercial automotive listing look.`,
  },
] satisfies readonly VehicleAiStudioTemplate[];

export function getVehicleAiStudioTemplate(
  templateId: VehicleAiStudioTemplateId,
): VehicleAiStudioTemplate {
  return vehicleAiStudioTemplates.find((item) => item.id === templateId)!;
}
