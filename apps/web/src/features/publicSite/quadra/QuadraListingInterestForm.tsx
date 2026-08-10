import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  applyInputMask,
  formatBrazilianPhone,
  normalizeBrazilianPhoneDigits,
} from "../../../lib/masks";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "../types";

type SubmissionState = "error" | "idle" | "submitted" | "submitting";

export function QuadraListingInterestForm({
  formId = "quadra-detail-interest",
  listingSlug,
  onSubmitInterest,
}: {
  formId?: string;
  listingSlug: string;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const [state, setState] = useState<SubmissionState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const buyerName = formValue(formData, "buyerName");
    if (!buyerName) return;

    setState("submitting");
    try {
      const buyerEmail = optionalFormValue(formData, "buyerEmail");
      const buyerPhone = normalizeBrazilianPhoneDigits(
        optionalFormValue(formData, "buyerPhone") ?? "",
      );
      const message = optionalFormValue(formData, "message");
      await onSubmitInterest(listingSlug, {
        ...(buyerEmail ? { buyerEmail } : {}),
        buyerName,
        ...(buyerPhone ? { buyerPhone } : {}),
        ...(message ? { message } : {}),
      });
      form.reset();
      setState("submitted");
    } catch {
      setState("error");
    }
  }

  return (
    <form
      className="quadra-detail-form"
      id={formId}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label className="quadra-detail-form__field">
        <span>Nome</span>
        <input
          autoComplete="name"
          name="buyerName"
          placeholder="Seu nome completo"
          required
        />
      </label>
      <label className="quadra-detail-form__field">
        <span>Telefone</span>
        <input
          autoComplete="tel"
          inputMode="tel"
          name="buyerPhone"
          onInput={(event) => {
            applyInputMask(event.currentTarget, formatBrazilianPhone);
          }}
          placeholder="Seu telefone"
          type="tel"
        />
      </label>
      <label className="quadra-detail-form__field quadra-detail-form__field--wide">
        <span>E-mail</span>
        <input
          autoComplete="email"
          name="buyerEmail"
          placeholder="Seu e-mail"
          type="email"
        />
      </label>
      <label className="quadra-detail-form__field quadra-detail-form__field--wide">
        <span>Mensagem</span>
        <textarea
          name="message"
          placeholder="Olá, tenho interesse neste veículo. Aguardo o contato."
          rows={4}
        />
      </label>
      <button
        className="quadra-detail-form__submit"
        disabled={state === "submitting"}
        type="submit"
      >
        <Send aria-hidden="true" />
        {state === "submitting" ? "Enviando..." : "Tenho interesse"}
      </button>
      {state === "submitted" ? (
        <p className="quadra-detail-form__success" role="status">
          Interesse enviado! A loja entrará em contato em breve.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="quadra-detail-form__error" role="alert">
          Não foi possível enviar o seu interesse no momento.
        </p>
      ) : null}
    </form>
  );
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormValue(formData: FormData, key: string) {
  return formValue(formData, key) || undefined;
}
