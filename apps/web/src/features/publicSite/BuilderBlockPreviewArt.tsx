import type { StorefrontBuilderComponentType } from "@lojaveiculosv2/shared";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const blockDescriptions: Record<StorefrontBuilderComponentType, string> = {
  about: "Historia, foto e diferenciais da loja.",
  contact_section: "Formulário com canais de contato.",
  container: "Agrupa blocos com respiro consistente.",
  cta: "Chamada direta para WhatsApp ou estoque.",
  divider: "Separador visual entre secoes.",
  featured: "Cards de veículos em destaque.",
  footer: "Links, redes e assinatura da loja.",
  gallery: "Mosaico de fotos e showroom.",
  header: "Menu, logo e botão de contato.",
  hero: "Primeira dobra com imagem e CTA.",
  image: "Foto editorial em destaque.",
  map: "Endereço com rota externa.",
  marquee: "Faixa animada para mensagens curtas.",
  properties_grid: "Grade completa de veículos.",
  scroll_zoom: "Imagem grande com texto editorial.",
  section_wrapper: "Seção com largura controlada.",
  spacer: "Espaçamento vertical ajustável.",
  testimonials: "Prova social de clientes.",
  text_block: "Texto corrido para condições e garantias.",
  two_column: "Layout lado a lado responsivo.",
  typewriter: "Headline animado por frases.",
  vehicle_specs: "Especificações técnicas do veículo.",
  video: "Vídeo institucional ou de estoque.",
};

export function blockDescription(type: StorefrontBuilderComponentType) {
  return blockDescriptions[type];
}

export function BuilderBlockPreviewArt({
  type,
}: {
  type: StorefrontBuilderComponentType;
}) {
  if (type === "hero") return <HeroPreview />;
  if (
    type === "featured" ||
    type === "properties_grid" ||
    type === "vehicle_specs"
  ) {
    return (
      <InventoryPreview
        dense={type === "properties_grid" || type === "vehicle_specs"}
      />
    );
  }
  if (type === "gallery") return <GalleryPreview />;
  if (type === "contact_section") return <ContactPreview />;
  if (type === "two_column") return <ColumnsPreview />;
  if (type === "header" || type === "footer")
    return <ChromePreview type={type} />;
  if (type === "testimonials") return <TestimonialsPreview />;
  if (type === "cta" || type === "typewriter" || type === "marquee") {
    return <StatementPreview animated={type !== "cta"} />;
  }
  if (type === "image" || type === "scroll_zoom" || type === "video") {
    return <MediaPreview video={type === "video"} />;
  }
  if (type === "container" || type === "section_wrapper") {
    return <LayoutPreview boxed={type === "section_wrapper"} />;
  }
  if (type === "map") return <MapPreview />;
  if (type === "spacer" || type === "divider")
    return <UtilityPreview type={type} />;
  return <TextPreview />;
}

function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <span className="block overflow-hidden rounded-lg border border-border/50 bg-background p-2 shadow-inner">
      {children}
    </span>
  );
}

function HeroPreview() {
  return (
    <PreviewShell>
      <span className="grid h-16 grid-cols-[1.2fr_0.8fr] gap-2">
        <span className="flex flex-col justify-center gap-1.5">
          <span className="h-1.5 w-10 rounded-full bg-primary" />
          <span className="h-2.5 w-20 rounded bg-foreground" />
          <span className="h-1.5 w-16 rounded bg-muted-foreground/50" />
          <span className="mt-1 h-4 w-12 rounded bg-primary" />
        </span>
        <span className="rounded-md bg-[linear-gradient(135deg,var(--color-primary),var(--color-muted))]" />
      </span>
    </PreviewShell>
  );
}

function InventoryPreview({ dense }: { dense?: boolean }) {
  return (
    <PreviewShell>
      <span
        className={cn(
          "grid h-16 gap-1.5",
          dense ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {[0, 1, 2].slice(0, dense ? 3 : 2).map((item) => (
          <span
            key={item}
            className="overflow-hidden rounded-md border border-border/50 bg-card"
          >
            <span className="block h-7 bg-muted" />
            <span className="block space-y-1 p-1.5">
              <span className="block h-1.5 rounded bg-foreground" />
              <span className="block h-1.5 w-2/3 rounded bg-primary" />
            </span>
          </span>
        ))}
      </span>
    </PreviewShell>
  );
}

function GalleryPreview() {
  return (
    <PreviewShell>
      <span className="grid h-16 grid-cols-3 gap-1.5">
        <span className="col-span-2 rounded-md bg-muted" />
        <span className="grid gap-1.5">
          <span className="rounded-md bg-primary/70" />
          <span className="rounded-md bg-foreground/70" />
        </span>
      </span>
    </PreviewShell>
  );
}

function ContactPreview() {
  return (
    <PreviewShell>
      <span className="grid h-16 grid-cols-[0.8fr_1.2fr] gap-2">
        <span className="space-y-1.5">
          <span className="block h-2 w-10 rounded bg-primary" />
          <span className="block h-2 w-14 rounded bg-foreground" />
          <span className="block h-2 w-12 rounded bg-muted" />
        </span>
        <span className="grid gap-1">
          <span className="rounded border border-border bg-card" />
          <span className="rounded border border-border bg-card" />
          <span className="rounded bg-primary" />
        </span>
      </span>
    </PreviewShell>
  );
}

function ColumnsPreview() {
  return (
    <PreviewShell>
      <span className="grid h-16 grid-cols-2 gap-2">
        <span className="rounded-md bg-card ring-1 ring-border" />
        <span className="rounded-md bg-muted" />
      </span>
    </PreviewShell>
  );
}

function ChromePreview({ type }: { type: "footer" | "header" }) {
  return (
    <PreviewShell>
      <span className="flex h-16 flex-col justify-between">
        <span
          className={cn(
            "flex h-4 items-center gap-1 rounded bg-card px-1",
            type === "footer" && "mt-auto h-8",
          )}
        >
          <span className="h-1.5 w-8 rounded bg-foreground" />
          <span className="ml-auto h-1.5 w-5 rounded bg-muted" />
          <span className="h-1.5 w-5 rounded bg-primary" />
        </span>
      </span>
    </PreviewShell>
  );
}

function TestimonialsPreview() {
  return <CardRows count={2} stars />;
}

function StatementPreview({ animated }: { animated?: boolean }) {
  return (
    <PreviewShell>
      <span className="flex h-16 flex-col items-center justify-center gap-2 text-center">
        <span className="h-2 w-24 rounded bg-foreground" />
        <span
          className={cn("h-2 rounded bg-primary", animated ? "w-16" : "w-20")}
        />
      </span>
    </PreviewShell>
  );
}

function MediaPreview({ video }: { video?: boolean }) {
  return (
    <PreviewShell>
      <span className="relative block h-16 rounded-md bg-muted">
        {video ? (
          <span className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        ) : null}
      </span>
    </PreviewShell>
  );
}

function LayoutPreview({ boxed }: { boxed?: boolean }) {
  return <CardRows count={boxed ? 1 : 3} />;
}

function MapPreview() {
  return (
    <PreviewShell>
      <span className="grid h-16 place-items-center rounded-md bg-muted">
        <span className="size-5 rounded-full bg-primary" />
      </span>
    </PreviewShell>
  );
}

function UtilityPreview({ type }: { type: "divider" | "spacer" }) {
  return (
    <PreviewShell>
      <span className="grid h-16 place-items-center">
        <span
          className={cn(
            "block bg-border",
            type === "divider" ? "h-px w-full" : "h-10 w-px",
          )}
        />
      </span>
    </PreviewShell>
  );
}

function TextPreview() {
  return <CardRows count={3} />;
}

function CardRows({ count, stars }: { count: number; stars?: boolean }) {
  return (
    <PreviewShell>
      <span className="grid h-16 gap-1.5">
        {Array.from({ length: count }).map((_, index) => (
          <span
            key={index}
            className="rounded-md border border-border bg-card p-1.5"
          >
            {stars ? (
              <span className="mb-1 block h-1.5 w-10 rounded bg-primary" />
            ) : null}
            <span className="block h-1.5 rounded bg-foreground" />
            <span className="mt-1 block h-1.5 w-2/3 rounded bg-muted" />
          </span>
        ))}
      </span>
    </PreviewShell>
  );
}
