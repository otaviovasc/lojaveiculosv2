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
  const [formStartedAt] = useState(() => Date.now());
  const [state, setState] = useState<SubmissionState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const buyerName = formValue(formData, "buyerName");
    if (!buyerName) return;

    setState("submitting");
    try {
      const buyerEmail = formValue(formData, "buyerEmail");
      const buyerPhone = normalizeBrazilianPhoneDigits(
        formValue(formData, "buyerPhone"),
      );
      if (buyerPhone.length < 10) throw new Error("Invalid buyer phone");
      const message = formValue(formData, "message");
      await onSubmitInterest(listingSlug, {
        buyerEmail,
        buyerName,
        buyerPhone,
        formStartedAt: Number(formValue(formData, "formStartedAt")),
        message,
        website: formValue(formData, "website"),
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
          required
          type="tel"
          minLength={10}
        />
      </label>
      <label className="quadra-detail-form__field quadra-detail-form__field--wide">
        <span>E-mail</span>
        <input
          autoComplete="email"
          name="buyerEmail"
          placeholder="Seu e-mail"
          required
          type="email"
        />
      </label>
      <label className="quadra-detail-form__field quadra-detail-form__field--wide">
        <span>Mensagem</span>
        <textarea
          name="message"
          placeholder="Olá, tenho interesse neste veículo. Aguardo o contato."
          required
          rows={4}
        />
      </label>
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input
          autoComplete="off"
          id={`${formId}-website`}
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
        className="quadra-detail-form__submit"
        disabled={state === "submitting"}
        type="submit"
      >
        <Send aria-hidden="true" />
        {state === "submitting" ? "Enviando..." : "Tenho interesse"}
      </button>
      {state === "submitted" ? (
        <p
          aria-live="polite"
          className="quadra-detail-form__success"
          role="status"
        >
          Interesse enviado! A loja entrará em contato em breve.
        </p>
      ) : null}
      {state === "error" ? (
        <p
          aria-live="polite"
          className="quadra-detail-form__error"
          role="status"
        >
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
