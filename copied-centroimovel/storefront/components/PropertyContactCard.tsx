"use client";

import { useContactTracking } from "@/modules/storefront/lib/engagement-tracking";
import {
  getMergedUtmData,
  getSessionId,
  getVisitorId,
} from "@/modules/storefront/lib/tracker";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface PropertyContactCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    rentPrice: number | null;
    condoFee: number | null;
    iptu: number | null;
    hidePrice: boolean;
    purpose: string;
  };
  config: {
    brandColor: string;
    accentColor: string;
    fonts: { heading: string; body: string };
    socialLinks?: { whatsapp?: string | null } | null;
    corretorName?: string | null;
  };
  workspaceSlug: string;
  workspaceId: string;
  formatBRL: (v: number) => string;
  isCaptacao?: boolean;
}

type CardFace = "cta" | "form" | "success";
type SubmitIntent = "message" | "whatsapp";

/* ── Validation helpers ─────────────────────────────────────────── */

function validateName(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return "Informe seu nome completo";
  if (trimmed.split(/\s+/).length < 2) return "Informe nome e sobrenome";
  if (trimmed.length < 5) return "Nome muito curto";
  return null;
}

function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validatePhone(v: string): string | null {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "Informe seu telefone";
  if (digits.length < 10 || digits.length > 11)
    return "Telefone inválido — use DDD + número";
  return null;
}

function validateEmail(v: string): string | null {
  if (!v.trim()) return null; // optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "E-mail inválido";
  return null;
}

/* ── Component ──────────────────────────────────────────────────── */

export function PropertyContactCard({
  property,
  config,
  workspaceSlug,
  workspaceId,
  formatBRL,
  isCaptacao = false,
}: PropertyContactCardProps) {
  const defaultMessage = `Olá! Tenho interesse no imóvel: ${property.title}`;
  const [face, setFace] = useState<CardFace>("cta");
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    message: defaultMessage,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const intentRef = useRef<SubmitIntent>("message");

  const whatsapp = config.socialLinks?.whatsapp;
  const whatsappClean = whatsapp?.replace(/\D/g, "");

  const { trackWhatsApp, trackFormStart, trackFormSubmit } = useContactTracking(
    workspaceId,
    property.id,
  );

  const isRent = property.purpose === "ALUGUEL";
  const totalPrice = isRent
    ? property.rentPrice || property.price
    : property.price;
  const monthlyCosts = (property.condoFee || 0) + (property.iptu || 0);

  function openForm(intent: SubmitIntent) {
    intentRef.current = intent;
    setFace("form");
    trackFormStart();
  }

  function handleBackToCta() {
    setFace("cta");
    setError(null);
    setFieldErrors({});
  }

  const handlePhoneChange = useCallback((raw: string) => {
    setFormState((s) => ({ ...s, phone: formatPhoneBR(raw) }));
    setFieldErrors((e) => ({ ...e, phone: null }));
  }, []);

  function validate(): boolean {
    const errs: Record<string, string | null> = {
      name: validateName(formState.name),
      phone: validatePhone(formState.phone),
      email: validateEmail(formState.email),
    };
    setFieldErrors(errs);
    return !errs.name && !errs.phone && !errs.email;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const mergedUtm = getMergedUtmData();

    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name.trim(),
          phone: formState.phone || null,
          email: formState.email.trim() || null,
          message: formState.message || defaultMessage,
          propertyId: property.id,
          source: isCaptacao ? "CAPTACAO_STOREFRONT" : "WORKSPACE_STOREFRONT",
          utmSource: mergedUtm.utm_source,
          utmMedium: mergedUtm.utm_medium,
          utmCampaign: mergedUtm.utm_campaign,
          utmTerm: mergedUtm.utm_term,
          utmContent: mergedUtm.utm_content,
          sessionUtmSource: mergedUtm.sessionSource,
          sessionUtmMedium: mergedUtm.sessionMedium,
          sessionUtmCampaign: mergedUtm.sessionCampaign,
          sessionUtmTerm: mergedUtm.sessionTerm,
          sessionUtmContent: mergedUtm.sessionContent,
          visitorId: getVisitorId(),
          sessionId: mergedUtm.sessionId ?? getSessionId(),
          referrer: document.referrer || null,
        }),
      });

      if (res.ok) {
        trackFormSubmit(true, formState);
        if (intentRef.current === "whatsapp" && whatsappClean) {
          trackWhatsApp(whatsappClean, formState.message || defaultMessage);
          window.open(
            `https://wa.me/${whatsappClean}?text=${encodeURIComponent(formState.message || defaultMessage)}`,
            "_blank",
          );
        }
        setFace("success");
      } else {
        trackFormSubmit(false, formState);
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            "Não foi possível enviar sua mensagem. Verifique os campos e tente novamente.",
        );
      }
    } catch {
      trackFormSubmit(false, formState);
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleWhatsAppAfterSubmit() {
    trackWhatsApp(whatsappClean || "", formState.message || defaultMessage);
    if (whatsappClean) {
      window.open(
        `https://wa.me/${whatsappClean}?text=${encodeURIComponent(formState.message || defaultMessage)}`,
        "_blank",
      );
    }
  }

  const inputBase =
    "w-full rounded-sm border-2 px-4 py-3.5 text-sm font-bold uppercase tracking-tight italic placeholder:opacity-40 placeholder:not-italic focus:outline-none transition-all";
  const inputStyle = (field: string) =>
    ({
      borderColor: fieldErrors[field] ? "#ef4444" : `${config.brandColor}10`,
      color: config.brandColor,
      backgroundColor: "transparent",
    }) as React.CSSProperties;

  return (
    <div
      className="rounded-sm bg-white border-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] overflow-hidden font-body"
      style={{ borderColor: `${config.brandColor}08` }}
    >
      {/* ─── CTA Face ─── */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          opacity: face === "cta" ? 1 : 0,
          maxHeight: face === "cta" ? "800px" : "0px",
          overflow: "hidden",
          pointerEvents: face === "cta" ? "auto" : "none",
        }}
      >
        <div className="p-10">
          {/* Pricing */}
          <div className="mb-10">
            {!property.hidePrice ? (
              <div className="space-y-2">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic"
                  style={{ color: config.brandColor }}
                >
                  {isRent ? "Locação Mensal" : "Valor de Investimento"}
                </p>
                <p
                  className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter"
                  style={{ color: config.brandColor }}
                >
                  {formatBRL(totalPrice)}
                </p>
              </div>
            ) : (
              <p
                className="text-2xl font-black uppercase tracking-tight italic"
                style={{ color: config.brandColor }}
              >
                Preço sob consulta
              </p>
            )}
          </div>

          {/* Monthly Costs */}
          {!property.hidePrice && (
            <div
              className="space-y-4 mb-10 pb-10 border-b-2"
              style={{ borderColor: `${config.brandColor}08` }}
            >
              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                <span
                  className="opacity-40"
                  style={{ color: config.brandColor }}
                >
                  Condomínio
                </span>
                <span style={{ color: config.brandColor }}>
                  {property.condoFee ? formatBRL(property.condoFee) : "Isento"}
                </span>
              </div>
              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                <span
                  className="opacity-40"
                  style={{ color: config.brandColor }}
                >
                  IPTU
                </span>
                <span style={{ color: config.brandColor }}>
                  {property.iptu ? formatBRL(property.iptu) : "Isento"}
                </span>
              </div>
              <div className="flex justify-between text-xl font-black uppercase italic tracking-tighter pt-4">
                <span style={{ color: config.brandColor }}>
                  Mensalidade Total
                </span>
                <span style={{ color: config.accentColor }}>
                  {formatBRL(totalPrice + monthlyCosts)}
                </span>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => openForm("message")}
              className="flex items-center justify-center gap-3 w-full py-5 rounded-sm text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
              style={{
                backgroundColor: config.brandColor,
              }}
            >
              <Send size={18} strokeWidth={2.5} />
              Enviar Proposta
            </button>

            {whatsappClean && (
              <button
                onClick={() => openForm("whatsapp")}
                className="flex items-center justify-center gap-3 w-full py-5 rounded-sm text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
                style={{ backgroundColor: "#000" }}
              >
                <MessageCircle size={18} strokeWidth={2.5} />
                WhatsApp Direto
              </button>
            )}
          </div>

          {/* Trust Badges */}
          <div
            className="mt-10 pt-10 border-t-2 space-y-6"
            style={{ borderColor: `${config.brandColor}08` }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-sm bg-stone-50 flex items-center justify-center shrink-0">
                <ShieldCheck
                  size={20}
                  className="opacity-30"
                  style={{ color: config.brandColor }}
                />
              </div>
              <p
                className="text-[10px] leading-relaxed font-bold uppercase tracking-widest opacity-40"
                style={{ color: config.brandColor }}
              >
                <strong>Imóvel Verificado.</strong> Todas as informações foram
                rigorosamente conferidas por nossa curadoria.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Form Face ─── */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          opacity: face === "form" ? 1 : 0,
          maxHeight: face === "form" ? "1000px" : "0px",
          overflow: "hidden",
          pointerEvents: face === "form" ? "auto" : "none",
        }}
      >
        <div className="p-10">
          <div className="flex items-center gap-4 mb-10">
            <button
              onClick={handleBackToCta}
              className="h-12 w-12 border-2 flex items-center justify-center transition-all hover:bg-black hover:text-white"
              style={{
                borderColor: `${config.brandColor}10`,
                color: config.brandColor,
              }}
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h3
                className="text-xl font-black uppercase italic tracking-tight font-display"
                style={{
                  color: config.brandColor,
                }}
              >
                {intentRef.current === "whatsapp"
                  ? "Contato WhatsApp"
                  : "Nova Proposta"}
              </h3>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 truncate max-w-[200px]"
                style={{ color: config.brandColor }}
              >
                {property.title}
              </p>
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            {/* Name */}
            <div>
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formState.name}
                onChange={(e) => {
                  setFormState((s) => ({ ...s, name: e.target.value }));
                  setFieldErrors((f) => ({ ...f, name: null }));
                }}
                className={inputBase}
                style={inputStyle("name")}
              />
              {fieldErrors.name && (
                <p className="mt-2 text-[10px] text-red-500 font-black uppercase tracking-widest">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Phone BR */}
            <div>
              <input
                type="tel"
                placeholder="Telefone (DDD) *"
                value={formState.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={inputBase}
                style={inputStyle("phone")}
              />
              {fieldErrors.phone && (
                <p className="mt-2 text-[10px] text-red-500 font-black uppercase tracking-widest">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="E-mail"
                value={formState.email}
                onChange={(e) => {
                  setFormState((s) => ({ ...s, email: e.target.value }));
                  setFieldErrors((f) => ({ ...f, email: null }));
                }}
                className={inputBase}
                style={inputStyle("email")}
              />
              {fieldErrors.email && (
                <p className="mt-2 text-[10px] text-red-500 font-black uppercase tracking-widest">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <textarea
                placeholder="Mensagem"
                rows={3}
                value={formState.message}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, message: e.target.value }))
                }
                className={`${inputBase} resize-none`}
                style={inputStyle("message")}
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-100 p-4">
                <p className="text-[10px] text-red-700 font-black uppercase tracking-widest">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-3 w-full py-5 rounded-sm text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 shadow-2xl mt-4"
              style={{
                backgroundColor:
                  intentRef.current === "whatsapp" ? "#000" : config.brandColor,
              }}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : intentRef.current === "whatsapp" ? (
                <MessageCircle size={18} strokeWidth={2.5} />
              ) : (
                <Send size={18} strokeWidth={2.5} />
              )}
              {submitting
                ? "Enviando..."
                : intentRef.current === "whatsapp"
                  ? "Finalizar no WhatsApp"
                  : "Confirmar Proposta"}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Success Face ─── */}
      <div
        className="transition-all duration-500 ease-out"
        style={{
          opacity: face === "success" ? 1 : 0,
          maxHeight: face === "success" ? "600px" : "0px",
          overflow: "hidden",
          pointerEvents: face === "success" ? "auto" : "none",
        }}
      >
        <div className="p-12 text-center">
          <div
            className="mx-auto mb-8 h-24 w-24 rounded-full flex items-center justify-center border-4"
            style={{
              borderColor: `${config.accentColor}20`,
              color: config.accentColor,
            }}
          >
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          <h3
            className="text-3xl font-black uppercase italic tracking-tighter mb-4 font-display"
            style={{
              color: config.brandColor,
            }}
          >
            Sucesso!
          </h3>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-40 mb-10 leading-relaxed"
            style={{ color: config.brandColor }}
          >
            {whatsappClean
              ? "Sua proposta foi registrada. Finalize o contato no WhatsApp para atendimento imediato."
              : "Sua proposta foi enviada. Nossa equipe entrará em contato em breve."}
          </p>

          {whatsappClean && (
            <button
              onClick={handleWhatsAppAfterSubmit}
              className="flex items-center justify-center gap-3 w-full py-5 rounded-sm text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
              style={{ backgroundColor: "#000" }}
            >
              <MessageCircle size={20} strokeWidth={2.5} />
              Abrir WhatsApp
            </button>
          )}

          <button
            onClick={() => setFace("cta")}
            className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity"
            style={{ color: config.brandColor }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}
