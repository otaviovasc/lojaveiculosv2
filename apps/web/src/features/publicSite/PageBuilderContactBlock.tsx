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
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-6 md:py-20 lg:py-24">
        <div className="flex flex-col justify-center">
          <BlockHeading props={props} />

          <div className="mt-8 grid gap-4">
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
          className="grid gap-4 rounded-xl border border-line bg-app p-6 shadow-sm md:p-8"
          onSubmit={(event) => void submit(event)}
        >
          {show("name") ? (
            <PublicInput name="name" placeholder="Nome completo" required />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {show("phone") ? (
              <PublicInput name="phone" placeholder="Telefone de contato" />
            ) : null}
            {show("email") ? (
              <PublicInput name="email" placeholder="E-mail" type="email" />
            ) : null}
          </div>
          {show("message") ? (
            <textarea
              className="min-h-28 rounded border border-line bg-panel p-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              name="message"
              placeholder="Digite sua mensagem aqui..."
            />
          ) : null}
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded px-6 text-xs font-bold text-inverse shadow-[0_4px_12px_color-mix(in_oklab,var(--color-accent)_15%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] hover:brightness-105 active:translate-y-0 active:scale-95 disabled:opacity-75 cursor-pointer"
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
              ? "Enviando..."
              : (textProp(props.submitButtonText) ?? "Enviar Mensagem")}
          </button>

          {status === "sent" ? (
            <p className="text-center text-sm font-bold text-accent">
              {textProp(props.successMessage) ??
                "Mensagem enviada com sucesso!"}
            </p>
          ) : null}
          {status === "error" ? (
            <p className="text-center text-sm font-bold text-danger">
              Não foi possível enviar a mensagem no momento.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
        CONTATO
      </p>
      <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
        {textProp(props.title) ?? "Fale conosco"}
      </h2>
      {textProp(props.subtitle) ? (
        <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-muted">
          {textProp(props.subtitle)}
        </p>
      ) : null}
    </div>
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
    <span className="flex items-center gap-3.5 rounded border border-line bg-panel p-4 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent border border-accent/10">
        <Icon aria-hidden="true" className="size-[1.125rem]" />
      </span>
      <span className="text-sm font-bold text-app-text">{label}</span>
    </span>
  );
}

function PublicInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-12 rounded border border-line bg-panel px-4 text-xs font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
    />
  );
}

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}
