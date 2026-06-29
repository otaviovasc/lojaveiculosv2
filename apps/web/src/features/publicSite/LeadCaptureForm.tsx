import { Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
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
        listingSlug,
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
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          aria-label="Nome"
          className="min-h-12 rounded border border-line bg-app px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
          name="buyerName"
          placeholder="Seu nome completo"
          required
        />
        <input
          aria-label="Telefone"
          className="min-h-12 rounded border border-line bg-app px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
          name="buyerPhone"
          placeholder="Seu telefone"
        />
      </div>
      <input
        aria-label="E-mail"
        className="min-h-12 rounded border border-line bg-app px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
        name="buyerEmail"
        placeholder="Seu e-mail"
        type="email"
      />
      <textarea
        aria-label="Mensagem"
        className="min-h-24 rounded border border-line bg-app p-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
        name="message"
        placeholder="Olá, tenho interesse neste veículo. Aguardo o contato."
      />
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded bg-accent px-6 text-xs font-bold text-inverse shadow-[0_4px_12px_color-mix(in_oklab,var(--color-accent)_15%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] hover:brightness-105 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        disabled={state.kind === "submitting"}
        type="submit"
      >
        <Send aria-hidden="true" className="size-4" />
        {state.kind === "submitting" ? "Enviando..." : "Tenho interesse"}
      </button>
      {state.kind === "submitted" ? (
        <p className="text-sm font-bold text-accent text-center mt-1">
          Interesse enviado! A loja recebeu seus dados e entrará em contato em
          breve.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="text-sm font-bold text-danger text-center mt-1">
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
    buyerName,
    ...optionalField("buyerEmail", getFormValue(formData, "buyerEmail")),
    ...optionalField("buyerPhone", getFormValue(formData, "buyerPhone")),
    ...optionalField("message", getFormValue(formData, "message")),
  };
}

function optionalField<Key extends keyof PublicStorefrontLeadInput>(
  key: Key,
  value: string | undefined,
) {
  return value ? { [key]: value } : {};
}
