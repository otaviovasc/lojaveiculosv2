"use client";

import { cn } from "@/lib/utils";
import {
  getMergedUtmData,
  getSessionId,
  getVisitorId,
} from "@/modules/storefront/lib/tracker";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion } from "framer-motion";
import { Check, Mail, MapPin, Phone, Send } from "lucide-react";
import { useContext, useState } from "react";
import { auroraFadeIn } from "../../templates/aurora/aurora-variants";
import { SectionSurface } from "./SectionSurface";
import { getStandardButtonStyles } from "./button-style-utils";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { formatCssFontStack, getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderContactSectionProps {
  title?: string;
  subtitle?: string;
  formBackgroundColor?: string;
  formTextColor?: string;
  fields?: {
    name?: boolean;
    phone?: boolean;
    email?: boolean;
    message?: boolean;
  };
  submitButtonText?: string;
  successMessage?: string;
  buttonStyle?: "primary" | "secondary" | "outline";
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  style?: ComponentStyleProps;
  config: StoreConfig;
  workspaceSlug: string;
}

export function BuilderContactSection({
  title,
  subtitle,
  formBackgroundColor: formBgProp,
  formTextColor: formTextProp,
  fields = {},
  submitButtonText = "Enviar Mensagem",
  successMessage = "Mensagem enviada com sucesso!",
  buttonStyle = "primary",
  buttonColor,
  buttonTextColor,
  buttonBorderColor,
  titleColor,
  subtitleColor,
  style,
  config,
  workspaceSlug,
}: BuilderContactSectionProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewDocument = useContext(PreviewDocumentContext);
  const contactMotionViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  const formBgColor = formBgProp || "#FFFFFF";
  const formTextColor = formTextProp || "#1A1A1A";
  const cardBorderRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "2rem";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const mergedUtm = getMergedUtmData();
      const res = await fetch(`/api/workspaces/${workspaceSlug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          message: formData.message,
          source: "CUSTOM_PAGE_CONTACT_FORM",
          visitorId: getVisitorId(),
          sessionId: mergedUtm.sessionId ?? getSessionId(),
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
          referrer:
            typeof document !== "undefined" ? document.referrer || null : null,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao enviar mensagem");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showName = fields.name !== false;
  const showPhone = fields.phone !== false;
  const showEmail = fields.email !== false;
  const showMessage = fields.message !== false;

  const getButtonStyles = () => {
    const btnColor = buttonColor || accentColor;
    const txtColor = buttonTextColor || "#FFFFFF";
    return {
      ...getStandardButtonStyles({
        variant: buttonStyle,
        primaryColor: btnColor,
        textColor: txtColor,
        borderColor: buttonBorderColor || txtColor,
      }),
      fontFamily: bodyFont,
    };
  };

  return (
    <SectionSurface
      style={style}
      className="px-0 pt-24 pb-36 md:px-12 md:pb-44"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-12 md:gap-16">
        <motion.div
          variants={auroraFadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={contactMotionViewport}
          className="space-y-10"
        >
          <div className="space-y-6 text-center md:text-left">
            {title && (
              <h2
                className="text-4xl md:text-5xl font-bold leading-tight tracking-tight"
                style={{
                  color: titleColor || resolvedTextColor,
                  fontFamily: headingFont,
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="text-lg md:text-xl opacity-80 font-light leading-relaxed"
                style={{
                  color: subtitleColor || resolvedTextColor,
                  fontFamily: bodyFont,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div className="space-y-6">
            {(config.contact?.phone ||
              config.contact?.email ||
              config.contact?.address) && (
              <div className="mx-auto max-w-xl space-y-4 md:mx-0 md:max-w-none">
                {config.contact?.phone && (
                  <a
                    href={`tel:${config.contact.phone}`}
                    className="group flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-transparent p-4 transition-all hover:border-white/10 hover:bg-white/5 sm:flex-row sm:items-center sm:gap-5"
                    style={{ color: resolvedTextColor, fontFamily: bodyFont }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 shadow-inner transition-transform group-hover:scale-110">
                      <Phone size={20} style={{ color: accentColor }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
                        Telefone
                      </span>
                      <span className="break-words text-base font-medium leading-snug sm:text-lg">
                        {config.contact.phone}
                      </span>
                    </div>
                  </a>
                )}
                {config.contact?.email && (
                  <a
                    href={`mailto:${config.contact.email}`}
                    className="group flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-transparent p-4 transition-all hover:border-white/10 hover:bg-white/5 sm:flex-row sm:items-center sm:gap-5"
                    style={{ color: resolvedTextColor, fontFamily: bodyFont }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 shadow-inner transition-transform group-hover:scale-110">
                      <Mail size={20} style={{ color: accentColor }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
                        Email
                      </span>
                      <span className="break-all text-base font-medium leading-snug sm:break-words sm:text-lg">
                        {config.contact.email}
                      </span>
                    </div>
                  </a>
                )}
                {config.contact?.address && (
                  <div
                    className="group flex w-full min-w-0 flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-5"
                    style={{ color: resolvedTextColor, fontFamily: bodyFont }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 shadow-inner transition-transform group-hover:scale-110">
                      <MapPin size={20} style={{ color: accentColor }} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">
                        Endereço
                      </span>
                      <span className="break-words text-base font-medium leading-snug sm:text-lg">
                        {config.contact.address}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          variants={auroraFadeIn("up")}
          initial="hidden"
          whileInView="show"
          viewport={contactMotionViewport}
          className="w-full"
        >
          {submitted ? (
            <div
              className="p-12 text-center shadow-2xl border border-white/5"
              style={{
                backgroundColor: formBgColor,
                borderRadius: cardBorderRadius,
              }}
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center shadow-inner"
                style={{ backgroundColor: `${accentColor}10` }}
              >
                <Check size={32} style={{ color: accentColor }} />
              </div>
              <h3
                className="text-2xl font-bold mb-4"
                style={{ color: formTextColor, fontFamily: headingFont }}
              >
                {successMessage}
              </h3>
              <p
                className="text-lg opacity-60 font-light"
                style={{ color: formTextColor, fontFamily: bodyFont }}
              >
                Recebemos sua mensagem e entraremos em contato o mais breve
                possível.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-10 text-sm font-bold uppercase tracking-[0.2em] cursor-pointer hover:opacity-70 transition-opacity"
                style={{ color: accentColor, fontFamily: bodyFont }}
              >
                Enviar outra mensagem
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-6 border border-white/5 p-5 shadow-2xl sm:space-y-8 sm:p-8 md:p-12"
              style={{
                backgroundColor: formBgColor,
                borderRadius: cardBorderRadius,
              }}
            >
              <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
                {showName && (
                  <div className="col-span-1 min-w-0 space-y-2">
                    <label
                      className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
                      style={{ color: formTextColor, fontFamily: bodyFont }}
                    >
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required={showName}
                      className="min-w-0 w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/5 sm:px-5 sm:py-4"
                      style={{
                        color: formTextColor,
                        fontFamily: bodyFont,
                      }}
                      placeholder="Como podemos te chamar?"
                    />
                  </div>
                )}

                {showPhone && (
                  <div className="col-span-1 min-w-0 space-y-2">
                    <label
                      className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
                      style={{ color: formTextColor, fontFamily: bodyFont }}
                    >
                      WhatsApp / Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required={showPhone}
                      className="min-w-0 w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/5 sm:px-5 sm:py-4"
                      style={{
                        color: formTextColor,
                        fontFamily: bodyFont,
                      }}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                )}

                {showEmail && (
                  <div
                    className={cn(
                      "col-span-1 min-w-0 space-y-2",
                      showMessage && "md:col-span-2",
                    )}
                  >
                    <label
                      className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
                      style={{ color: formTextColor, fontFamily: bodyFont }}
                    >
                      Endereço de Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required={showEmail && !showName && !showPhone}
                      className="min-w-0 w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/5 sm:px-5 sm:py-4"
                      style={{
                        color: formTextColor,
                        fontFamily: bodyFont,
                      }}
                      placeholder="seu@email.com"
                    />
                  </div>
                )}

                {showMessage && (
                  <div className="col-span-1 min-w-0 space-y-2 md:col-span-2">
                    <label
                      className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
                      style={{ color: formTextColor, fontFamily: bodyFont }}
                    >
                      Sua Mensagem
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      required={
                        showMessage && !showName && !showPhone && !showEmail
                      }
                      rows={5}
                      className="min-w-0 w-full resize-none rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/5 sm:px-5 sm:py-4"
                      style={{
                        color: formTextColor,
                        fontFamily: bodyFont,
                      }}
                      placeholder="No que podemos te ajudar hoje?"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl font-bold uppercase tracking-[0.25em] text-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl"
                style={getButtonStyles()}
              >
                {isSubmitting ? (
                  <>Enviando...</>
                ) : (
                  <>
                    {submitButtonText}
                    <Send size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </SectionSurface>
  );
}
