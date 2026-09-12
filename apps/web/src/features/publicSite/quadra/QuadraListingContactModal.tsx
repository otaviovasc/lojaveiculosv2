import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
} from "../types";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { QuadraDetailContactActions } from "./QuadraListingContact";
import { QuadraListingInterestForm } from "./QuadraListingInterestForm";

export function QuadraListingContactModal({
  imageUrl,
  listingSlug,
  model,
  onClose,
  onSubmitInterest,
  price,
  showLeadForm,
  title,
}: {
  imageUrl: string | null;
  listingSlug: string;
  model: QuadraStorefrontModel;
  onClose: () => void;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  price: string;
  showLeadForm: boolean;
  title: string;
}) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        containFocus(event, dialogRef.current);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      aria-labelledby={headingId}
      aria-modal="true"
      className="quadra-detail-contact-modal"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      ref={dialogRef}
      role="dialog"
    >
      <div className="quadra-detail-contact-modal__panel">
        <button
          aria-label="Fechar contato"
          className="quadra-detail-contact-modal__close"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
        <div className="quadra-detail-contact-modal__accent" />
        <div className="quadra-detail-contact-modal__content">
          {imageUrl ? <img alt={title} src={imageUrl} /> : null}
          <h2 id={headingId}>Interessado neste veículo?</h2>
          <p>{title}</p>
          <strong>{price}</strong>
          <p>
            Entre em contato agora e tire todas as suas dúvidas sobre este
            veículo!
          </p>
          <QuadraDetailContactActions
            model={model}
            showInterestAction={false}
            title={title}
          />
          {showLeadForm ? (
            <QuadraListingInterestForm
              formId="quadra-detail-modal-interest"
              listingSlug={listingSlug}
              onSubmitInterest={onSubmitInterest}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function containFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
