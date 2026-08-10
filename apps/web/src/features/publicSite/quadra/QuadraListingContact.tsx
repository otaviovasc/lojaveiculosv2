import { MessageCircle, Phone } from "lucide-react";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
} from "../types";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import { formatPhone } from "./QuadraHeader";
import { InstagramIcon } from "./QuadraSocialIcons";
import { QuadraListingInterestForm } from "./QuadraListingInterestForm";
import {
  quadraDetailPhoneHref,
  quadraDetailWhatsappUrl,
} from "./QuadraListingDetailModel";

type SubmitInterest = (
  listingSlug: string,
  input: PublicStorefrontLeadInput,
) => Promise<PublicStorefrontLeadResult>;

export function QuadraListingContactCard({
  detail,
  model,
  onOpenContact,
  onSubmitInterest,
  showLeadForm,
}: {
  detail: PublicStorefrontListingDetailData;
  model: QuadraStorefrontModel;
  onOpenContact: () => void;
  onSubmitInterest: SubmitInterest;
  showLeadForm: boolean;
}) {
  return (
    <aside className="quadra-detail-contact" id="contact-section">
      <h2>Interessado nesse veículo?</h2>
      <QuadraDetailContactActions
        model={model}
        onOpenContact={onOpenContact}
        title={detail.listing.title}
      />
      <div className="quadra-detail-contact__status">
        <span>Status:</span> Disponível
      </div>
      {showLeadForm ? (
        <QuadraListingInterestForm
          listingSlug={detail.listing.slug}
          onSubmitInterest={onSubmitInterest}
        />
      ) : null}
    </aside>
  );
}

export function QuadraDetailContactActions({
  model,
  onOpenContact,
  showInterestAction = true,
  title,
}: {
  model: QuadraStorefrontModel;
  onOpenContact?: () => void;
  showInterestAction?: boolean;
  title: string;
}) {
  const whatsappUrl = quadraDetailWhatsappUrl(model, title);
  const phoneHref = quadraDetailPhoneHref(model);

  return (
    <div className="quadra-detail-contact__actions">
      {whatsappUrl ? (
        <a
          className="quadra-detail-contact__action quadra-detail-contact__action--whatsapp"
          href={whatsappUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" />
          Fale com a gente
        </a>
      ) : null}
      {showInterestAction ? (
        <button
          className="quadra-detail-contact__action quadra-detail-contact__action--interest"
          onClick={onOpenContact}
          type="button"
        >
          Tenho Interesse
        </button>
      ) : null}
      {phoneHref ? (
        <a
          className="quadra-detail-contact__action quadra-detail-contact__action--phone"
          href={phoneHref}
        >
          <Phone aria-hidden="true" />
          Ligar para Loja
        </a>
      ) : null}
    </div>
  );
}

export function QuadraDetailSeller({
  model,
  title,
}: {
  model: QuadraStorefrontModel;
  title: string;
}) {
  const whatsappUrl = quadraDetailWhatsappUrl(model, title);
  const phoneHref = quadraDetailPhoneHref(model);

  return (
    <section className="quadra-detail-seller">
      <div className="quadra-detail-seller__identity">
        {model.logoUrl ? (
          <img alt={`Logo ${model.storeName}`} src={model.logoUrl} />
        ) : null}
        <div>
          <h2>{model.storeName}</h2>
          <p>Contato direto da loja</p>
        </div>
      </div>
      <div className="quadra-detail-seller__links">
        {whatsappUrl ? (
          <a href={whatsappUrl} rel="noopener noreferrer" target="_blank">
            <MessageCircle aria-hidden="true" />
            {model.contact.phone
              ? formatPhone(model.contact.phone)
              : "WhatsApp"}
          </a>
        ) : null}
        {phoneHref ? (
          <a href={phoneHref}>
            <Phone aria-hidden="true" />
            Ligar para loja
          </a>
        ) : null}
        {model.contact.instagramUrl ? (
          <a
            href={model.contact.instagramUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <InstagramIcon />
            Instagram
          </a>
        ) : null}
        {model.contact.businessHours ? (
          <p className="quadra-detail-seller__hours">
            <strong>Horário:</strong> {model.contact.businessHours}
          </p>
        ) : null}
        {model.contact.address ? (
          <p className="quadra-detail-seller__address">
            <strong>Endereço:</strong> {model.contact.address}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function QuadraDetailMobileActions({
  model,
  title,
}: {
  model: QuadraStorefrontModel;
  title: string;
}) {
  const whatsappUrl = quadraDetailWhatsappUrl(model, title);
  const phoneHref = quadraDetailPhoneHref(model);

  return (
    <nav aria-label="Ações de contato" className="quadra-detail-mobile-actions">
      {whatsappUrl ? (
        <a
          className="quadra-detail-mobile-actions__whatsapp"
          href={whatsappUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" />
          <span>Falar com vendedor</span>
        </a>
      ) : null}
      {model.contact.instagramUrl ? (
        <a
          aria-label="Instagram"
          href={model.contact.instagramUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <InstagramIcon />
        </a>
      ) : null}
      {phoneHref ? (
        <a aria-label="Ligar" href={phoneHref}>
          <Phone aria-hidden="true" />
        </a>
      ) : null}
    </nav>
  );
}
