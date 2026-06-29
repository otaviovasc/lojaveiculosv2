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
    <section
      className="grid gap-5 rounded-lg border border-line bg-panel p-5 md:grid-cols-[0.9fr_1.1fr]"
      id="contato"
    >
      <div>
        <BlockHeading props={props} />
        <div className="mt-4 grid gap-2 text-sm font-bold">
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
        className="grid gap-3 rounded-lg border border-line bg-app p-4"
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
            className="min-h-24 rounded-lg border border-line bg-panel p-3 text-sm font-bold"
            name="message"
            placeholder="Mensagem"
          />
        ) : null}
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-black text-inverse disabled:opacity-70"
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
          <p className="text-sm font-black text-accent">
            {textProp(props.successMessage) ?? "Mensagem enviada."}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm font-black text-danger">
            Nao foi possivel enviar agora.
          </p>
        ) : null}
      </form>
    </section>
  );
}

function BlockHeading({ props }: { props: Record<string, unknown> }) {
  return (
    <>
      <h2 className="text-xl font-black">{textProp(props.title) ?? "Secao"}</h2>
      {textProp(props.subtitle) ? (
        <p className="mt-1 text-sm font-bold text-muted">
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
    <span className="flex items-center gap-2 rounded-lg bg-app p-3">
      <Icon aria-hidden="true" className="size-4 text-accent" />
      {label}
    </span>
  );
}

function PublicInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-11 rounded-lg border border-line bg-panel px-3 text-sm font-bold"
    />
  );
}

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}
