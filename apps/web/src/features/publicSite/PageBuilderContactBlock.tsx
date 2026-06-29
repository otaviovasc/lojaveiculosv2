import { Check, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { useState, type FormEvent, type InputHTMLAttributes } from "react";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import { textProp } from "./pageBuilderRenderUtils";

export function ContactSectionBlock({ component, context }: BuilderBlockProps) {
  const [status, setStatus] = useState<"error" | "idle" | "sent" | "sending">(
    "idle",
  );
  const props = component.props;
  const fields =
    props.fields && typeof props.fields === "object"
      ? (props.fields as Record<string, unknown>)
      : {};
  const show = (key: string) => fields[key] !== false;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const response = await fetch(
        `/api/v1/public/storefront/pages/${encodeURIComponent(context.pageSlug)}/leads`,
        {
          body: JSON.stringify({
            buyerEmail: value(formData, "email"),
            buyerName: value(formData, "name") ?? "Contato pelo site",
            buyerPhone: value(formData, "phone"),
            message: value(formData, "message"),
          }),
          headers: {
            "Content-Type": "application/json",
            ...(context.storeSlug ? { "x-store-slug": context.storeSlug } : {}),
          },
          method: "POST",
        },
      );
      if (!response.ok) throw new Error("Lead request failed");
      event.currentTarget.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }
  return (
    <section className="bg-panel" id="contato">
      <div className="public-storefront-shell grid gap-8 px-4 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20">
        <div>
          <BlockHeading props={props} />
          <div className="mt-6 grid gap-3 text-sm font-medium text-muted">
            <ContactLine icon={Phone} label={context.config.contact.phone} />
            <ContactLine
              icon={MessageCircle}
              label={context.config.contact.whatsapp}
            />
            <ContactLine icon={Mail} label={context.config.contact.email} />
            <ContactLine icon={MapPin} label={context.config.contact.address} />
          </div>
        </div>
        <form
          className="grid gap-3 rounded-[2rem] bg-app p-5 shadow-[0_24px_70px_rgb(15_23_42_/_0.08)] md:p-6"
          onSubmit={(event) => void submit(event)}
        >
          {show("name") ? (
            <PublicInput name="name" placeholder="Nome" required />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {show("phone") ? (
              <PublicInput name="phone" placeholder="Telefone" />
            ) : null}
            {show("email") ? (
              <PublicInput name="email" placeholder="Email" type="email" />
            ) : null}
          </div>
          {show("message") ? (
            <textarea
              className="min-h-24 rounded-2xl border border-line bg-panel p-4 text-sm font-medium text-app-text outline-none transition-[border-color,box-shadow] focus:border-accent/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
              name="message"
              placeholder="Mensagem"
            />
          ) : null}
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-inverse shadow-[0_18px_44px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98] disabled:opacity-70"
            disabled={status === "sending"}
            style={{ background: context.accent }}
            type="submit"
          >
            {status === "sent" ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Send aria-hidden="true" className="size-4" />
            )}
            {status === "sending"
              ? "Enviando"
              : (textProp(props.submitButtonText) ?? "Enviar mensagem")}
          </button>
          {status === "sent" ? (
            <p className="text-sm font-semibold text-accent">
              {textProp(props.successMessage) ?? "Mensagem enviada."}
            </p>
          ) : null}
          {status === "error" ? (
            <p className="text-sm font-semibold text-danger">
              Nao foi possivel enviar agora.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
        {textProp(props.title) ?? "Secao"}
      </h2>
      {textProp(props.subtitle) ? (
        <p className="mt-3 max-w-2xl text-base font-medium leading-8 text-muted">
          {textProp(props.subtitle)}
        </p>
      ) : null}
    </>
  );
}

function ContactLine({
  icon: Icon,
  label,
}: {
  icon: typeof Phone;
  label: string | null | undefined;
}) {
  if (!label) return null;
  return (
    <span className="flex items-center gap-2 rounded-2xl bg-app p-3">
      <Icon aria-hidden="true" className="size-4 text-accent" />
      {label}
    </span>
  );
}

function PublicInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-12 rounded-2xl border border-line bg-panel px-4 text-sm font-medium text-app-text outline-none transition-[border-color,box-shadow] focus:border-accent/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
    />
  );
}

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}
