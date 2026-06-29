"use client";

import type { StoreConfig } from "@centroimovel/types";
import { MessageCircle } from "lucide-react";

interface QuadraWhatsAppButtonProps {
  config: StoreConfig;
}

export function QuadraWhatsAppButton({ config }: QuadraWhatsAppButtonProps) {
  const phone = config.socialLinks.whatsapp;
  if (!phone) return null;

  const cleanPhone = phone.replace(/\D/g, "");
  const message = "Olá! Gostaria de mais informações sobre os imóveis.";

  return (
    <a
      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
      style={{ backgroundColor: "#25D366" }}
      aria-label="Abrir WhatsApp para conversar"
    >
      <MessageCircle size={26} />
    </a>
  );
}
