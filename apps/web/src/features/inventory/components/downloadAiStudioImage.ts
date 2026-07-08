import type { AiStudioTemplateId } from "../model/aiStudioTypes";

export async function downloadAiStudioImage({
  imageUrl,
  listingTitle,
  templateId,
}: {
  imageUrl: string;
  listingTitle: string;
  templateId: AiStudioTemplateId;
}) {
  const fileName = `${slugify(listingTitle)}-ia-${templateId}.png`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Unable to download AI image.");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 500);
  } catch {
    triggerDownload(imageUrl, fileName);
  }
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function slugify(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || "foto-veiculo";
}
