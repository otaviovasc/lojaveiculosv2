import {
  CalendarDays,
  CarFront,
  Fuel,
  Gauge,
  Palette,
  Settings2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type SVGProps,
} from "react";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicVehicleListing,
} from "../types";
import type { QuadraStorefrontModel } from "./quadraAdapter";
import {
  QuadraDetailMobileActions,
  QuadraDetailSeller,
  QuadraListingContactCard,
} from "./QuadraListingContact";
import { QuadraListingContactModal } from "./QuadraListingContactModal";
import {
  createQuadraDetailMediaGroups,
  createQuadraDetailSpecs,
  quadraDetailPrice,
} from "./QuadraListingDetailModel";
import {
  QuadraDetailShare,
  QuadraRelatedVehicles,
} from "./QuadraListingDetailExtras";
import { QuadraListingGallery } from "./QuadraListingGallery";

const specIcons: readonly ComponentType<SVGProps<SVGSVGElement>>[] = [
  CalendarDays,
  Gauge,
  Settings2,
  Fuel,
  Palette,
  CarFront,
];

export function QuadraListingDetailContent({
  availableListings,
  detail,
  model,
  onOpenListing,
  onSubmitInterest,
  showLeadForm,
}: {
  availableListings: readonly PublicVehicleListing[];
  detail: PublicStorefrontListingDetailData;
  model: QuadraStorefrontModel;
  onOpenListing: (listingSlug: string) => void;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  showLeadForm: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "seller">("details");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const tabId = useId();
  const detailTabRef = useRef<HTMLButtonElement>(null);
  const sellerTabRef = useRef<HTMLButtonElement>(null);
  const contactTimerRef = useRef<number | null>(null);
  const closeContact = useCallback(() => {
    if (contactTimerRef.current !== null) {
      window.clearTimeout(contactTimerRef.current);
    }
    setIsContactOpen(false);
  }, []);
  const openContact = useCallback(() => {
    if (contactTimerRef.current !== null) {
      window.clearTimeout(contactTimerRef.current);
    }
    setIsContactOpen(true);
  }, []);
  const groups = useMemo(() => createQuadraDetailMediaGroups(detail), [detail]);
  const colorNames = useMemo(
    () =>
      Array.from(
        new Set(
          detail.listing.mediaGroups.flatMap((group) =>
            group.colorName ? [group.colorName] : [],
          ),
        ),
      ),
    [detail.listing.mediaGroups],
  );
  const specs = useMemo(
    () => createQuadraDetailSpecs(detail, colorNames),
    [colorNames, detail],
  );
  const relatedListings = useMemo(
    () =>
      availableListings
        .filter((listing) => listing.slug !== detail.listing.slug)
        .slice(0, 6),
    [availableListings, detail.listing.slug],
  );
  const price = quadraDetailPrice(detail);
  const contactImageUrl =
    groups
      .flatMap((group) => group.media)
      .find((media) => media.kind === "photo")?.url ??
    detail.listing.thumbnailUrl;

  useEffect(() => {
    contactTimerRef.current = window.setTimeout(() => {
      if (!document.querySelector('[role="dialog"]')) setIsContactOpen(true);
    }, 15_000);
    return () => {
      if (contactTimerRef.current !== null) {
        window.clearTimeout(contactTimerRef.current);
      }
    };
  }, [detail.listing.slug]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextTab =
      event.key === "ArrowLeft" || event.key === "Home" ? "details" : "seller";
    setActiveTab(nextTab);
    (nextTab === "details" ? detailTabRef : sellerTabRef).current?.focus();
  }

  return (
    <>
      <div className="quadra-detail__layout">
        <main className="quadra-detail__main">
          <QuadraListingGallery
            groups={groups}
            listingIdentity={detail.listing.slug}
            title={detail.listing.title}
          />

          <header className="quadra-detail__vehicle-header">
            {detail.listing.commercialTags.length > 0 ? (
              <div className="quadra-detail__tags">
                {detail.listing.commercialTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}
            <h1>{detail.listing.title}</h1>
            {detail.listing.trimName ? <p>{detail.listing.trimName}</p> : null}
          </header>

          <div className="quadra-detail-tabs" role="tablist">
            <button
              aria-controls={`${tabId}-details-panel`}
              aria-selected={activeTab === "details"}
              className="quadra-detail-tabs__tab"
              id={`${tabId}-details-tab`}
              onClick={() => setActiveTab("details")}
              onKeyDown={handleTabKeyDown}
              ref={detailTabRef}
              role="tab"
              tabIndex={activeTab === "details" ? 0 : -1}
              type="button"
            >
              Veículo
            </button>
            <button
              aria-controls={`${tabId}-seller-panel`}
              aria-selected={activeTab === "seller"}
              className="quadra-detail-tabs__tab"
              id={`${tabId}-seller-tab`}
              onClick={() => setActiveTab("seller")}
              onKeyDown={handleTabKeyDown}
              ref={sellerTabRef}
              role="tab"
              tabIndex={activeTab === "seller" ? 0 : -1}
              type="button"
            >
              Vendedor
            </button>
          </div>

          <div
            aria-labelledby={`${tabId}-${activeTab}-tab`}
            className="quadra-detail-tabs__panel"
            id={`${tabId}-${activeTab}-panel`}
            role="tabpanel"
          >
            {activeTab === "details" ? (
              <>
                <p className="quadra-detail__price">{price}</p>
                <div className="quadra-detail-specs">
                  {specs.map((spec, index) => {
                    const SpecIcon = specIcons[index] ?? CarFront;
                    return (
                      <div
                        className="quadra-detail-specs__item"
                        key={spec.label}
                      >
                        <SpecIcon aria-hidden="true" />
                        <div>
                          <span>{spec.label}</span>
                          <strong>{spec.value}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <QuadraDetailShare
                  key={detail.listing.slug}
                  price={price}
                  title={detail.listing.title}
                />
                {detail.listing.description ? (
                  <section className="quadra-detail-description">
                    <h2>Descrição</h2>
                    <p>{detail.listing.description}</p>
                  </section>
                ) : null}
              </>
            ) : (
              <QuadraDetailSeller model={model} title={detail.listing.title} />
            )}
          </div>
        </main>

        <QuadraListingContactCard
          detail={detail}
          model={model}
          onOpenContact={openContact}
          onSubmitInterest={onSubmitInterest}
          showLeadForm={showLeadForm}
        />
      </div>

      <QuadraRelatedVehicles
        listings={relatedListings}
        onOpenListing={onOpenListing}
      />

      <QuadraDetailMobileActions model={model} title={detail.listing.title} />
      {isContactOpen ? (
        <QuadraListingContactModal
          imageUrl={contactImageUrl}
          listingSlug={detail.listing.slug}
          model={model}
          onClose={closeContact}
          onSubmitInterest={onSubmitInterest}
          price={price}
          showLeadForm={showLeadForm}
          title={detail.listing.title}
        />
      ) : null}
    </>
  );
}
