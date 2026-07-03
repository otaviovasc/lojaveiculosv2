import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PageChromeFields({
  draft,
  fallbackColor,
  onDraftChange,
  pageChrome,
}: {
  draft: StorefrontCustomPage;
  fallbackColor: string;
  onDraftChange: (page: StorefrontCustomPage) => void;
  pageChrome: NonNullable<StorefrontCustomPage["pageChrome"]>;
}) {
  const updateChrome = (
    update: Partial<NonNullable<StorefrontCustomPage["pageChrome"]>>,
  ) => onDraftChange({ ...draft, pageChrome: { ...pageChrome, ...update } });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Cabeçalho e rodapé
      </p>
      <ChromeCheckbox
        checked={pageChrome.showHeader !== false}
        label="Mostrar cabeçalho"
        onChange={(checked) => updateChrome({ showHeader: checked })}
      />
      <ChromeCheckbox
        checked={pageChrome.showSiteLink !== false}
        label="Link voltar ao site"
        onChange={(checked) => updateChrome({ showSiteLink: checked })}
      />
      <ChromeCheckbox
        checked={pageChrome.showFooter !== false}
        label="Mostrar rodapé"
        onChange={(checked) => updateChrome({ showFooter: checked })}
      />
      <div className="space-y-2">
        <Label>Estilo do topo</Label>
        <select
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          onChange={(event) =>
            updateChrome({
              headerVariant: event.target.value as
                "glass" | "minimal" | "solid",
            })
          }
          value={pageChrome.headerVariant ?? "minimal"}
        >
          <option value="minimal">Vidro leve</option>
          <option value="glass">Vidro forte</option>
          <option value="solid">Sólido</option>
        </select>
      </div>
      {pageChrome.headerVariant === "solid" ? (
        <ColorTextField
          fallbackColor={fallbackColor}
          label="Cor de fundo do topo"
          onChange={(value) => updateChrome({ headerBgColor: value || null })}
          value={pageChrome.headerBgColor ?? fallbackColor}
        />
      ) : null}
      <ColorTextField
        fallbackColor={fallbackColor}
        label="Cor do link voltar"
        onChange={(value) => updateChrome({ headerLinkColor: value || null })}
        value={pageChrome.headerLinkColor ?? ""}
      />
      <Input
        onChange={(event) =>
          updateChrome({ footerExtraLine: event.target.value || null })
        }
        placeholder="Texto extra no rodapé"
        value={pageChrome.footerExtraLine ?? ""}
      />
      <ColorTextField
        fallbackColor={fallbackColor}
        label="Cor do texto do rodapé"
        onChange={(value) =>
          updateChrome({ footerChromeTextColor: value || null })
        }
        value={pageChrome.footerChromeTextColor ?? ""}
      />
    </div>
  );
}

function ChromeCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold">
      <span>{label}</span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function ColorTextField({
  fallbackColor,
  label,
  onChange,
  value,
}: {
  fallbackColor: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          className="h-10 w-14 shrink-0 p-1"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value || fallbackColor}
        />
        <Input
          className="font-mono text-xs"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Padrão do tema"
          value={value}
        />
      </div>
    </div>
  );
}
