import type {
  StorefrontBuilderBackground,
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import { Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageChromeFields } from "./CustomPageChromeSettings";
import { slugifyCustomPage } from "./customPageUtils";
import { storefrontFontOptions } from "./storefrontFonts";

export function PageSettingsFields({
  config,
  draft,
  onDraftChange,
  previewUrl,
}: {
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
  previewUrl: string;
}) {
  const pageChrome = draft.pageChrome ?? {};
  const pageBackground = draft.pageBackground ?? {
    solidColor: draft.backgroundColor ?? config.backgroundColor,
    type: "solid",
  };

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Configuracoes da pagina
        </p>
        <h3 className="text-base font-semibold text-foreground">
          {draft.title}
        </h3>
      </div>
      <PageIdentityFields draft={draft} onDraftChange={onDraftChange} />
      <PageTypographyFields
        config={config}
        draft={draft}
        onDraftChange={onDraftChange}
      />
      <PageColorFields
        config={config}
        draft={draft}
        onDraftChange={onDraftChange}
        pageBackground={pageBackground as StorefrontBuilderBackground}
      />
      <PageChromeFields
        draft={draft}
        fallbackColor={draft.backgroundColor ?? config.backgroundColor}
        onDraftChange={onDraftChange}
        pageChrome={pageChrome}
      />
      <PageSeoFields draft={draft} onDraftChange={onDraftChange} />
      <PreviewLinkField previewUrl={previewUrl} />
      <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm font-semibold">
        <span>Publicar pagina</span>
        <input
          checked={draft.visible}
          onChange={(event) =>
            onDraftChange({ ...draft, visible: event.target.checked })
          }
          type="checkbox"
        />
      </label>
    </div>
  );
}

function PageIdentityFields({
  draft,
  onDraftChange,
}: {
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Titulo</Label>
        <Input
          maxLength={120}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
          value={draft.title}
        />
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <Input
          maxLength={80}
          onChange={(event) =>
            onDraftChange({
              ...draft,
              slug: slugifyCustomPage(event.target.value),
            })
          }
          value={draft.slug}
        />
      </div>
      <div className="space-y-2">
        <Label>Descricao</Label>
        <Textarea
          maxLength={320}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
          value={draft.description ?? ""}
        />
      </div>
    </>
  );
}

function PageTypographyFields({
  config,
  draft,
  onDraftChange,
}: {
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Tipografia
      </p>
      <div className="space-y-2">
        <Label>Fonte da pagina</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onChange={(event) =>
            onDraftChange({
              ...draft,
              fontFamily:
                event.target.value === "inherit" ? null : event.target.value,
            })
          }
          value={draft.fontFamily ?? "inherit"}
        >
          <option value="inherit">Usar fonte do storefront</option>
          {storefrontFontOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Padrao atual: {config.fonts.body}
        </p>
      </div>
    </div>
  );
}

function PageColorFields({
  config,
  draft,
  onDraftChange,
  pageBackground,
}: {
  config: StorefrontBuilderConfig;
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
  pageBackground: StorefrontBuilderBackground;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Destaque</Label>
          <Input
            onChange={(event) =>
              onDraftChange({ ...draft, accentColor: event.target.value })
            }
            type="color"
            value={draft.accentColor ?? config.accentColor}
          />
        </div>
        <div className="space-y-2">
          <Label>Fundo</Label>
          <Input
            onChange={(event) =>
              onDraftChange({ ...draft, backgroundColor: event.target.value })
            }
            type="color"
            value={draft.backgroundColor ?? config.backgroundColor}
          />
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fundo da pagina
        </p>
        <Label>Cor de fundo</Label>
        <Input
          onChange={(event) =>
            onDraftChange({
              ...draft,
              backgroundColor: event.target.value,
              pageBackground: {
                ...pageBackground,
                solidColor: event.target.value,
                type: "solid",
              },
            })
          }
          type="color"
          value={
            pageBackground.type === "solid"
              ? (pageBackground.solidColor ?? config.backgroundColor)
              : (draft.backgroundColor ?? config.backgroundColor)
          }
        />
      </div>
    </>
  );
}

function PageSeoFields({
  draft,
  onDraftChange,
}: {
  draft: StorefrontCustomPage;
  onDraftChange: (page: StorefrontCustomPage) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        SEO
      </p>
      <Input
        maxLength={120}
        onChange={(event) =>
          onDraftChange({
            ...draft,
            seo: { ...(draft.seo ?? {}), metaTitle: event.target.value },
          })
        }
        placeholder="Titulo meta"
        value={draft.seo?.metaTitle ?? ""}
      />
      <Textarea
        maxLength={320}
        onChange={(event) =>
          onDraftChange({
            ...draft,
            seo: {
              ...(draft.seo ?? {}),
              metaDescription: event.target.value,
            },
          })
        }
        placeholder="Descricao meta"
        rows={3}
        value={draft.seo?.metaDescription ?? ""}
      />
    </div>
  );
}

function PreviewLinkField({ previewUrl }: { previewUrl: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <Label>Link de preview</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={previewUrl} />
        <button
          aria-label="Copiar link de preview"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => void navigator.clipboard?.writeText(previewUrl)}
          type="button"
        >
          <Copy aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
