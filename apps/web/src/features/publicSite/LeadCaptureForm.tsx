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
      className="mt-6 grid gap-3"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          aria-label="Nome"
          className="min-h-11 rounded-lg border border-line bg-app px-3 font-bold"
          name="buyerName"
          placeholder="Seu nome"
          required
        />
        <input
          aria-label="Telefone"
          className="min-h-11 rounded-lg border border-line bg-app px-3 font-bold"
          name="buyerPhone"
          placeholder="Telefone"
        />
      </div>
      <input
        aria-label="E-mail"
        className="min-h-11 rounded-lg border border-line bg-app px-3 font-bold"
        name="buyerEmail"
        placeholder="E-mail"
        type="email"
      />
      <textarea
        aria-label="Mensagem"
        className="min-h-24 rounded-lg border border-line bg-app p-3 font-bold"
        name="message"
        placeholder="Mensagem"
      />
      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse disabled:cursor-not-allowed disabled:opacity-70"
        disabled={state.kind === "submitting"}
        type="submit"
      >
        <Send aria-hidden="true" className="size-4" />
        {state.kind === "submitting" ? "Enviando" : "Tenho interesse"}
      </button>
      {state.kind === "submitted" ? (
        <p className="text-sm font-black text-accent">
          Interesse enviado. A loja recebeu seus dados.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="text-sm font-black text-danger">
          Nao foi possivel enviar agora.
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
