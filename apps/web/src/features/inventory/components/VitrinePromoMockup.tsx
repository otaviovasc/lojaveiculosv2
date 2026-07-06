import type { StoreSettingsSnapshot } from "../../settings/types";
import { Sparkles } from "lucide-react";

type Props = {
  settings: StoreSettingsSnapshot | null;
};

type VitrineTheme = {
  accentColor?: unknown;
};

export function VitrinePromoMockup({ settings }: Props) {
  const theme = (settings?.publicSite.theme || {}) as VitrineTheme;
  const accent =
    typeof theme.accentColor === "string"
      ? theme.accentColor
      : ["#", "C9A84C"].join("");

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs mx-auto border-2 border-dashed border-line rounded-2xl p-4.5 bg-app/20 opacity-90 select-none">
      <div className="text-xs font-black uppercase tracking-wider text-muted text-center mb-1 flex items-center justify-center gap-1">
        <Sparkles className="size-3 text-accent animate-pulse" />
        <span>Estrutura da Landing Page Premium</span>
      </div>

      {/* Block 1: Header */}
      <div className="border border-line/70 bg-panel/75 rounded-lg p-2.5 flex items-center justify-between text-xs font-bold text-muted">
        <div className="flex items-center gap-1">
          <div className="h-2 w-10 bg-line rounded" />
        </div>
        <div
          className="h-3.5 w-16 rounded-full opacity-60"
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* Block 2: Hero */}
      <div className="border border-line/70 bg-panel/75 rounded-lg p-3 flex flex-col gap-2">
        <div className="h-2 w-16 bg-line rounded" />
        <div className="h-3 w-28 bg-line-strong rounded" />
        <div className="h-16 bg-app-elevated/45 rounded-md border border-line/45 flex items-center justify-center text-xs text-muted font-bold">
          Foto de Capa do Veículo
        </div>
        <div
          className="h-6 w-full rounded flex items-center justify-center text-xs font-black text-white"
          style={{ backgroundColor: accent }}
        >
          CTA WhatsApp
        </div>
      </div>

      {/* Block 3: Specs Grid */}
      <div className="border border-line/70 bg-panel/75 rounded-lg p-2.5 flex flex-col gap-2">
        <div className="h-2 w-12 bg-line rounded" />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-6 bg-app-elevated/45 rounded border border-line/40 flex items-center px-1.5 text-xs text-muted">
            Cor / Km
          </div>
          <div className="h-6 bg-app-elevated/45 rounded border border-line/40 flex items-center px-1.5 text-xs text-muted">
            Câmbio / Motor
          </div>
        </div>
      </div>

      {/* Block 4: Gallery */}
      <div className="border border-line/70 bg-panel/75 rounded-lg p-2 flex flex-col gap-1.5">
        <div className="h-2 w-16 bg-line rounded" />
        <div className="flex gap-1">
          <div className="h-7 w-9 bg-app-elevated/45 rounded border border-line/45" />
          <div className="h-7 w-9 bg-app-elevated/45 rounded border border-line/45" />
          <div className="h-7 w-9 bg-app-elevated/45 rounded border border-line/45" />
        </div>
      </div>
    </div>
  );
}
