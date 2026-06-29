"use client";

import type { StoreConfig } from "@centroimovel/types";
import { MessageCircle } from "lucide-react";

interface AuroraWhatsAppButtonProps {
  config: StoreConfig;
}

export function AuroraWhatsAppButton({ config }: AuroraWhatsAppButtonProps) {
  const phone = config.socialLinks.whatsapp;
  if (!phone) return null;

  const cleanPhone = phone.replace(/\D/g, "");
  const message =
    "Olá! Gostaria de mais informações sobre os imóveis de alto padrão.";

  return (
    <a
      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
      style={{ backgroundColor: "#25D366" }}
      aria-label="Abrir WhatsApp para conversar"
    >
      <MessageCircle size={24} strokeWidth={2} />
    </a>
  );
}
