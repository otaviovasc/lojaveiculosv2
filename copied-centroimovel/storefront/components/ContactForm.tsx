"use client";

import {
  getFirstTouchUtmData,
  getSessionId,
  getSessionUtmData,
  getVisitorId,
} from "@/modules/storefront/lib/tracker";
import { useState } from "react";

interface ContactFormProps {
  slug: string;
  propertyId?: string;
  propertyTitle?: string;
  brandColor: string;
  accentColor: string;
  source?: string;
}

export default function ContactForm({
  slug,
  propertyId,
  propertyTitle,
  brandColor,
  accentColor,
  source = "CENTRO_IMOVEL_FORM",
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    propertyTitle ? `Olá! Tenho interesse no imóvel "${propertyTitle}".` : "",
  );
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      // Use session UTM data, fallback to first-touch, fallback to URL
      const firstTouchUtm = getFirstTouchUtmData();
      const sessionUtm = getSessionUtmData();
      const sp = new URLSearchParams(window.location.search);

      const mergedUtm = {
        ...firstTouchUtm,
        ...sessionUtm,
        // Current URL has highest priority for this specific submission
        utm_source: sp.get("utm_source"),
        utm_medium: sp.get("utm_medium"),
        utm_campaign: sp.get("utm_campaign"),
        utm_term: sp.get("utm_term"),
        utm_content: sp.get("utm_content"),
        fbclid: sp.get("fbclid"),
        gclid: sp.get("gclid"),
      };

      const res = await fetch(`/api/workspaces/${slug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          email: email || null,
          message: message || null,
          propertyId: propertyId || null,
          source,
          utmSource: mergedUtm.utm_source || firstTouchUtm.utm_source || null,
          utmMedium: mergedUtm.utm_medium || firstTouchUtm.utm_medium || null,
          utmCampaign:
            mergedUtm.utm_campaign || firstTouchUtm.utm_campaign || null,
          utmTerm: mergedUtm.utm_term || firstTouchUtm.utm_term || null,
          utmContent:
            mergedUtm.utm_content || firstTouchUtm.utm_content || null,
          fbclid: mergedUtm.fbclid || firstTouchUtm.fbclid || null,
          gclid: mergedUtm.gclid || firstTouchUtm.gclid || null,
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          referrer: document.referrer || null,
        }),
      });

      if (res.ok) {
        setStatus("success");
        setName("");
        setPhone("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ borderColor: `${accentColor}30` }}
      >
        <p className="text-lg font-semibold" style={{ color: brandColor }}>
          Mensagem enviada!
        </p>
        <p className="mt-1 text-sm opacity-60" style={{ color: brandColor }}>
          Entraremos em contato em breve.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium underline"
          style={{ color: accentColor }}
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6"
      style={{ borderColor: `${brandColor}15` }}
    >
      <h3 className="mb-4 text-lg font-semibold" style={{ color: brandColor }}>
        Entrar em Contato
      </h3>
      <div className="space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome *"
          className={inputClass}
          style={{ borderColor: `${brandColor}20`, color: brandColor }}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp / Telefone"
          className={inputClass}
          style={{ borderColor: `${brandColor}20`, color: brandColor }}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={inputClass}
          style={{ borderColor: `${brandColor}20`, color: brandColor }}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mensagem"
          rows={3}
          className={inputClass}
          style={{ borderColor: `${brandColor}20`, color: brandColor }}
        />
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">
          Erro ao enviar. Tente novamente.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: accentColor }}
      >
        {status === "loading" ? "Enviando..." : "Enviar Mensagem"}
      </button>
    </form>
  );
}
