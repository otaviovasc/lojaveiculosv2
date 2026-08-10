// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicStorefront } from "../PublicStorefront";
import { publicStorefrontPreview } from "../fixtures";
import type {
  PublicStorefrontListingDetailData,
  PublicStorefrontPageData,
  PublicVehicleListing,
} from "../types";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("QUADRA vehicle detail", () => {
  it("uses the classic gallery with thumbnails, keyboard navigation and body lock", () => {
    renderDetail();

    expect(document.querySelector("[data-quadra-detail]")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: vehicleDetail().listing.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 126.900")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir galeria em tela cheia" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Galeria de fotos em tela cheia",
    });
    expect(document.body).toHaveStyle({ overflow: "hidden" });
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders seller/contact actions and submits the V2 listing-interest contract", async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      deduplicated: false,
      lead: { id: "lead-1", source: "public_site", status: "new" },
    });
    renderDetail({ onSubmit });

    expect(
      screen.getAllByRole("link", { name: /Fale com/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Ligar para Loja" })[0],
    ).toHaveAttribute("href", "tel:+5511999999999");

    fireEvent.click(screen.getByRole("tab", { name: "Vendedor" }));
    expect(
      screen.getByRole("heading", { name: "Loja Demo Motors" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Instagram" }).length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Maria Cliente" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "(11) 98888-7777" },
    });
    fireEvent.change(screen.getByLabelText("Mensagem"), {
      target: { value: "Quero agendar uma visita." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tenho interesse" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("fiat-toro-2023", {
        buyerName: "Maria Cliente",
        buyerPhone: "11988887777",
        message: "Quero agendar uma visita.",
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Interesse enviado");
  });

  it("keeps Aurora on the existing detail renderer", () => {
    const data = storefrontData();
    data.settings.site.layoutKey = "aurora";
    renderDetail({ data });

    expect(document.querySelector("[data-quadra-detail]")).toBeNull();
    expect(screen.getByText("Oferta da loja")).toBeInTheDocument();
  });

  it("preserves retry and close behavior in the QUADRA loading states", () => {
    const onClose = vi.fn();
    const onRetry = vi.fn();
    renderDetail({
      detail: {
        error: new Error("offline"),
        isLoading: false,
        listingSlug: "fiat-toro-2023",
      },
      onClose,
      onRetry,
    });

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shares with clipboard fallback, opens loaded related vehicles and honors the lead-form toggle", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const onOpen = vi.fn();
    renderDetail({ onOpen });

    fireEvent.click(
      screen.getByRole("button", { name: "Compartilhar esse Veículo" }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(location.href));
    expect(screen.getByRole("status")).toHaveTextContent("Link copiado");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Abrir detalhes de Jeep Renegade Longitude 2022",
      }),
    );
    expect(onOpen).toHaveBeenCalledWith("jeep-renegade-2022");

    cleanup();
    const data = storefrontData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      lead_form: { show_on_vehicle: false },
    };
    renderDetail({ data });
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tenho Interesse" }));
    expect(
      screen.getByRole("dialog", { name: "Interessado neste veículo?" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();
  });

  it("uses roving tabs and opens the timed contact dialog with contained focus", () => {
    vi.useFakeTimers();
    renderDetail();
    const vehicleTab = screen.getByRole("tab", { name: "Veículo" });
    const sellerTab = screen.getByRole("tab", { name: "Vendedor" });

    vehicleTab.focus();
    fireEvent.keyDown(vehicleTab, { key: "ArrowRight" });
    expect(sellerTab).toHaveFocus();
    expect(sellerTab).toHaveAttribute("tabindex", "0");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", sellerTab.id);

    void act(() => vi.advanceTimersByTime(15_000));
    const dialog = screen.getByRole("dialog", {
      name: "Interessado neste veículo?",
    });
    const close = within(dialog).getByRole("button", {
      name: "Fechar contato",
    });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.body).toHaveStyle({ overflow: "hidden" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders document previews safely and traps fullscreen gallery focus", () => {
    const detail = vehicleDetail();
    detail.listing.mediaGroups = [
      {
        colorName: "Prata",
        media: [
          {
            ...vehicleMedia("https://cdn.test/document.pdf", 0),
            kind: "document_preview",
          },
          vehicleMedia("https://cdn.test/front.jpg", 1),
        ],
        unitId: "unit-1",
      },
    ];
    renderDetail({
      detail: {
        data: detail,
        isLoading: false,
        listingSlug: detail.listing.slug,
      },
    });

    expect(screen.getByRole("img", { name: /Mídia 1/ })).toHaveTextContent(
      "Documento",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir galeria em tela cheia" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Galeria de fotos em tela cheia",
    });
    const close = within(dialog).getByRole("button", {
      name: "Fechar galeria",
    });
    close.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).not.toBe(close);
  });
});

function renderDetail({
  data = storefrontData(),
  detail = {
    data: vehicleDetail(),
    isLoading: false,
    listingSlug: "fiat-toro-2023",
  },
  onClose = vi.fn(),
  onOpen = vi.fn(),
  onRetry = vi.fn(),
  onSubmit = vi.fn(),
}: {
  data?: PublicStorefrontPageData;
  detail?: Parameters<typeof PublicStorefront>[0]["detail"];
  onClose?: () => void;
  onOpen?: (listingSlug: string) => void;
  onRetry?: () => void;
  onSubmit?: Parameters<typeof PublicStorefront>[0]["onSubmitListingInterest"];
} = {}) {
  return render(
    <PublicStorefront
      data={data}
      detail={detail}
      onCloseListing={onClose}
      onOpenListing={onOpen}
      onRetryListing={onRetry}
      onSubmitListingInterest={onSubmit}
    />,
  );
}

function storefrontData(): PublicStorefrontPageData {
  const data = structuredClone(publicStorefrontPreview);
  data.settings.site.layoutKey = "quadra";
  data.settings.site.theme = {
    logoUrl: "https://cdn.test/logo.svg",
    socialLinks: { instagram: "https://instagram.com/loja-demo" },
  };
  return data;
}

function vehicleDetail(): PublicStorefrontListingDetailData {
  const listing = structuredClone(
    publicStorefrontPreview.listings[0],
  ) as PublicVehicleListing;
  const media = [
    vehicleMedia("https://cdn.test/front.jpg", 0),
    vehicleMedia("https://cdn.test/rear.jpg", 1),
  ];
  return {
    listing: {
      ...listing,
      commercialTags: ["Destaque"],
      media,
      mediaGroups: [{ colorName: "Prata", media, unitId: "unit-1" }],
    },
    store: publicStorefrontPreview.store,
  };
}

function vehicleMedia(url: string, displayOrder: number) {
  return {
    altText: "Fiat Toro Volcano 2023",
    displayOrder,
    kind: "photo" as const,
    unitColorName: "Prata",
    unitId: "unit-1",
    url,
  };
}
