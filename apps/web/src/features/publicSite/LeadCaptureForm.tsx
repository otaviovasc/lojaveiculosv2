import { Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  applyInputMask,
  formatBrazilianPhone,
  normalizeBrazilianPhoneDigits,
} from "../../lib/masks";
import { deriveLeadCaptureState, type LeadCaptureSnapshot } from "./state";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "./types";

export function LeadCaptureForm({
  listingSlug,
  onSubmitInterest,
}: {
  listingSlug: string;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  return (
    <StorefrontLeadCaptureForm
      onSubmitInterest={(input) => onSubmitInterest(listingSlug, input)}
    />
  );
}

export function StorefrontLeadCaptureForm({
  defaultMessage,
  onSubmitInterest,
}: {
  defaultMessage?: string;
  onSubmitInterest: (
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const [formStartedAt] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<LeadCaptureSnapshot>({
    isSubmitting: false,
  });
  const state = deriveLeadCaptureState(snapshot);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setSnapshot({ isSubmitting: true });
    try {
      const result = await onSubmitInterest(
        createLeadInput(formData, getRequiredFormValue(formData, "buyerName")),
      );
      form.reset();
      setSnapshot({ isSubmitting: false, submittedLeadId: result.lead.id });
    } catch (error) {
      setSnapshot({
        error: error instanceof Error ? error : new Error(String(error)),
        isSubmitting: false,
      });
    }
  }

  return (
    <form
      className="mt-5 grid gap-5"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          aria-label="Nome"
          className="min-h-12 rounded-xl border border-line bg-panel px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
          name="buyerName"
          placeholder="Seu nome completo"
          required
        />
        <input
          aria-label="Telefone"
          className="min-h-12 rounded-xl border border-line bg-panel px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
          inputMode="tel"
          name="buyerPhone"
          onInput={(event) => {
            applyInputMask(event.currentTarget, formatBrazilianPhone);
          }}
          placeholder="Seu telefone"
          required
          type="tel"
          minLength={10}
        />
      </div>
      <input
        aria-label="E-mail"
        className="min-h-12 rounded-xl border border-line bg-panel px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
        name="buyerEmail"
        placeholder="Seu e-mail"
        required
        type="email"
      />
      <textarea
        aria-label="Mensagem"
        className="min-h-28 rounded-xl border border-line bg-panel p-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
        name="message"
        placeholder="Olá, tenho interesse. Aguardo o contato."
        defaultValue={defaultMessage}
        required
      />
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="storefront-lead-website">Website</label>
        <input
          autoComplete="off"
          id="storefront-lead-website"
          name="website"
          tabIndex={-1}
        />
      </div>
      <input
        defaultValue={String(formStartedAt)}
        name="formStartedAt"
        type="hidden"
      />
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-xs font-bold text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        disabled={state.kind === "submitting"}
        type="submit"
      >
        <Send aria-hidden="true" className="size-4" />
        {state.kind === "submitting" ? "Enviando..." : "Tenho interesse"}
      </button>
      {state.kind === "submitted" ? (
        <p
          aria-live="polite"
          className="text-sm font-bold text-accent text-center mt-1"
          role="status"
        >
          Interesse enviado! A loja recebeu seus dados e entrará em contato em
          breve.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p
          aria-live="polite"
          className="text-sm font-bold text-danger text-center mt-1"
          role="status"
        >
          Não foi possível enviar o seu interesse no momento.
        </p>
      ) : null}
    </form>
  );
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getRequiredFormValue(formData: FormData, key: string) {
  const value = getFormValue(formData, key);
  if (!value) throw new Error(`Missing form value: ${key}`);
  return value;
}

function createLeadInput(
  formData: FormData,
  buyerName: string,
): PublicStorefrontLeadInput {
  return {
    buyerEmail: getRequiredFormValue(formData, "buyerEmail"),
    buyerName,
    buyerPhone: getRequiredPhoneDigits(formData),
    formStartedAt: Number(getRequiredFormValue(formData, "formStartedAt")),
    message: getRequiredFormValue(formData, "message"),
    website: getFormValue(formData, "website") ?? "",
  };
}

function getRequiredPhoneDigits(formData: FormData) {
  const digits = normalizeBrazilianPhoneDigits(
    getRequiredFormValue(formData, "buyerPhone"),
  );
  if (digits.length < 10) throw new Error("Invalid buyer phone");
  return digits;
}
