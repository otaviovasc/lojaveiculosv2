import { BadgeDollarSign, Store, Pipette } from "lucide-react";
import {
  ContentToggle,
  ControlSection,
  RangeControl,
} from "./ImageTemplateControlPrimitives";
import { PRICE_COLOR_PRESETS } from "./ImageTemplateTypes";
import type { ImageTemplateEditorState } from "./useImageTemplateEditorState";

export function ImageTemplateContentSection({
  editor,
  hasPhone,
  hasWebsite,
}: {
  editor: ImageTemplateEditorState;
  hasPhone: boolean;
  hasWebsite: boolean;
}) {
  const active = editor.activeSection === "content";

  return (
    <ControlSection
      active={active}
      icon={<Store className="size-4" />}
      onToggle={() => editor.setActiveSection(active ? null : "content")}
      title="Marca e conteúdo"
    >
      <div className="space-y-4 p-4 pt-3">
        <div className="grid gap-2 grid-cols-1">
          <ContentToggle
            checked={editor.showVehicleDetails}
            description="Título, ano e combustível"
            label="Ficha do veículo"
            onChange={editor.setShowVehicleDetails}
          />
          <ContentToggle
            checked={editor.showPrice}
            description="Valor anunciado no estoque"
            disabled={!editor.showVehicleDetails}
            label="Preço"
            onChange={editor.setShowPrice}
          />
          <ContentToggle
            checked={editor.showGlassBox}
            description="Melhora a leitura sobre a foto"
            label="Painel de leitura"
            onChange={editor.setShowGlassBox}
          />
          <ContentToggle
            checked={editor.showContactSection}
            description="Rodapé com dados da loja"
            label="Contato da loja"
            onChange={editor.setShowContactSection}
          />
        </div>

        {editor.showGlassBox ? (
          <div className="space-y-4">
            <RangeControl
              defaultValue={0.08}
              label="Opacidade do painel"
              max="0.95"
              maxLabel="Sólido"
              min="0.01"
              minLabel="Transparente"
              onChange={editor.setGlassOpacity}
              step="0.01"
              value={editor.glassOpacity}
              valueLabel={`${Math.round(editor.glassOpacity * 100)}%`}
            />
            <RangeControl
              defaultValue={15}
              label="Desfoque do painel"
              max="40"
              maxLabel="40px"
              min="0"
              minLabel="0px"
              onChange={editor.setGlassBlur}
              step="1"
              value={editor.glassBlur}
              valueLabel={`${editor.glassBlur}px`}
            />
          </div>
        ) : null}

        {editor.showContactSection ? (
          <div className="grid gap-2 grid-cols-1">
            <ContentToggle
              checked={editor.showPhones}
              description={
                hasPhone ? "Telefone ou WhatsApp" : "Não configurado"
              }
              disabled={!hasPhone}
              label="Telefone"
              onChange={editor.setShowPhones}
            />
            <ContentToggle
              checked={editor.showWebsite}
              description={
                hasWebsite ? "Domínio público da loja" : "Não configurado"
              }
              disabled={!hasWebsite}
              label="Site"
              onChange={editor.setShowWebsite}
            />
            <RangeControl
              defaultValue={0}
              label="Posição do contato"
              max="150"
              maxLabel="+150px"
              min="-150"
              minLabel="−150px"
              onChange={editor.setFooterYOffset}
              step="5"
              value={editor.footerYOffset}
              valueLabel={`${editor.footerYOffset}px`}
            />
            <RangeControl
              defaultValue={1}
              label="Tamanho do contato"
              max="1.5"
              maxLabel="1,50x"
              min="0.5"
              minLabel="0,50x"
              onChange={editor.setContactSizeScale}
              step="0.05"
              value={editor.contactSizeScale}
              valueLabel={`${editor.contactSizeScale.toFixed(2)}x`}
            />
          </div>
        ) : null}

        {editor.showPrice ? (
          <div>
            <div className="mb-2 text-xs font-black text-app-text">
              Cor do preço
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PRICE_COLOR_PRESETS.map((color) => {
                const isActive =
                  editor.priceColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    aria-label={`Usar cor do preço ${color}`}
                    aria-pressed={isActive}
                    className={[
                      "size-9 cursor-pointer rounded-lg border transition-[border-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      isActive
                        ? "scale-105 border-accent ring-2 ring-accent ring-offset-2 ring-offset-app-elevated"
                        : "border-line hover:scale-105 hover:border-line-strong",
                    ].join(" ")}
                    key={color}
                    onClick={() => editor.setPriceColor(color)}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                );
              })}

              <label
                className={[
                  "relative flex size-9 cursor-pointer items-center justify-center rounded-lg border transition-[border-color,transform] outline-none hover:scale-105",
                  !PRICE_COLOR_PRESETS.some(
                    (p) => p.toLowerCase() === editor.priceColor.toLowerCase(),
                  )
                    ? "scale-105 border-accent ring-2 ring-accent ring-offset-2 ring-offset-app-elevated"
                    : "border-line hover:border-line-strong bg-app-elevated",
                ].join(" ")}
                style={
                  !PRICE_COLOR_PRESETS.some(
                    (p) => p.toLowerCase() === editor.priceColor.toLowerCase(),
                  )
                    ? { backgroundColor: editor.priceColor }
                    : undefined
                }
                title="Cor de preço personalizada"
              >
                <span className="grid size-6 place-items-center rounded-md border border-line bg-panel text-app-text">
                  <Pipette className="size-4" />
                </span>
                <input
                  type="color"
                  value={editor.priceColor}
                  onChange={(e) => editor.setPriceColor(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>

              <span className="select-all font-mono text-xs font-bold uppercase text-muted">
                {editor.priceColor}
              </span>
            </div>
          </div>
        ) : null}

        <div className="space-y-4 text-xs font-bold text-app-text">
          <RangeControl
            defaultValue={1}
            label="Tamanho da marca"
            max="1.8"
            maxLabel="1,80x"
            min="0.6"
            minLabel="0,60x"
            onChange={editor.setLogoScale}
            step="0.05"
            value={editor.logoScale}
            valueLabel={`${editor.logoScale.toFixed(2)}x`}
          />
          <RangeControl
            defaultValue={1}
            label="Tamanho das informações"
            max="1.3"
            maxLabel="1,30x"
            min="0.8"
            minLabel="0,80x"
            onChange={editor.setFontSizeScale}
            step="0.05"
            value={editor.fontSizeScale}
            valueLabel={`${editor.fontSizeScale.toFixed(2)}x`}
          />
          <RangeControl
            defaultValue={0}
            label="Posição das informações"
            max="200"
            maxLabel="+200px"
            min="-200"
            minLabel="−200px"
            onChange={editor.setCardYOffset}
            step="5"
            value={editor.cardYOffset}
            valueLabel={`${editor.cardYOffset}px`}
          />
        </div>
      </div>
    </ControlSection>
  );
}
