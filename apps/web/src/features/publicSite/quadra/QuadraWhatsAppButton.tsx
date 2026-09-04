import { MessageCircle } from "lucide-react";
import type { QuadraStorefrontModel } from "./quadraAdapter";

export function QuadraWhatsAppButton({
  model,
}: {
  model: QuadraStorefrontModel;
}) {
  if (!model.contact.whatsappUrl) return null;
  const separator = model.contact.whatsappUrl.includes("?") ? "&" : "?";
  const message = encodeURIComponent(
    "Olá! Gostaria de mais informações sobre os veículos disponíveis.",
  );
  return (
    <a
      aria-label="Fale conosco no WhatsApp"
      className="quadra-whatsapp-button"
      href={`${model.contact.whatsappUrl}${separator}text=${message}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <MessageCircle aria-hidden="true" />
    </a>
  );
}
