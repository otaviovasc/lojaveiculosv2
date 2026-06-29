import type {
  StorefrontBuilderComponent,
  StorefrontBuilderStyle,
} from "@lojaveiculosv2/shared";
import {
  BuilderColorInput,
  BuilderNumberInput,
  BuilderSelectInput,
  BuilderTextInput,
  recordValue,
} from "./BuilderBlockEditorFields";
import { alignOptions, EditorStack } from "./BuilderBlockEditorShared";
import { storefrontFontOptions } from "./storefrontFonts";

const fontSizeOptions = [
  { label: "Herdar", value: "none" },
  { label: "Pequeno", value: "0.875rem" },
  { label: "Padrao", value: "1rem" },
  { label: "Medio", value: "1.125rem" },
  { label: "Grande", value: "1.25rem" },
  { label: "Titulo", value: "1.5rem" },
  { label: "Hero", value: "2rem" },
] as const;

const spacingOptions = [
  { label: "Herdar", value: "none" },
  { label: "Nenhum", value: "0" },
  { label: "Pequeno", value: "0.5rem" },
  { label: "Padrao", value: "1rem" },
  { label: "Medio", value: "1.5rem" },
  { label: "Grande", value: "2rem" },
  { label: "Extra", value: "3rem" },
] as const;

const radiusOptions = [
  { label: "Herdar", value: "none" },
  { label: "Nenhum", value: "0" },
  { label: "Pequeno", value: "0.375rem" },
  { label: "Padrao", value: "0.5rem" },
  { label: "Grande", value: "0.75rem" },
  { label: "Extra", value: "1rem" },
  { label: "Circular", value: "9999px" },
] as const;

const shadowOptions = [
  { label: "Nenhuma", value: "none" },
  { label: "Suave", value: "sm" },
  { label: "Media", value: "md" },
  { label: "Forte", value: "lg" },
  { label: "Brilho", value: "glow" },
] as const;

const animationOptions = [
  { label: "Nenhuma", value: "none" },
  { label: "Aparecer", value: "fade-in" },
  { label: "Subir", value: "slide-up" },
  { label: "Zoom", value: "zoom-in" },
] as const;

const blockFontOptions = [
  { label: "Herdar", value: "none" },
  ...storefrontFontOptions,
] as const;

export function BuilderBlockStyleEditor({
  component,
  onChange,
}: {
  component: StorefrontBuilderComponent;
  onChange: (component: StorefrontBuilderComponent) => void;
}) {
  const style = recordValue(component.props.style) as StorefrontBuilderStyle;
  const updateStyle = <K extends keyof StorefrontBuilderStyle>(
    key: K,
    value: StorefrontBuilderStyle[K] | "none" | "",
  ) => {
    const nextStyle = { ...style };
    if (value === "" || value === "none") delete nextStyle[key];
    else nextStyle[key] = value as StorefrontBuilderStyle[K];
    onChange({
      ...component,
      props: {
        ...component.props,
        style: nextStyle,
      },
    });
  };

  return (
    <section className="mt-5 rounded-lg border border-line bg-app p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted">
        Estilo do bloco
      </p>
      <EditorStack>
        <BuilderSelectInput
          label="Fonte"
          onChange={(value) => updateStyle("fontFamily", value)}
          options={blockFontOptions}
          value={style.fontFamily ?? "none"}
        />
        <BuilderSelectInput
          label="Tamanho do texto"
          onChange={(value) => updateStyle("fontSize", value)}
          options={fontSizeOptions}
          value={style.fontSize ?? "none"}
        />
        <BuilderSelectInput
          label="Alinhamento"
          onChange={(value) => updateStyle("textAlign", value)}
          options={alignOptions}
          value={style.textAlign ?? "left"}
        />
        <BuilderColorInput
          label="Cor do texto"
          onChange={(value) => updateStyle("textColor", value)}
          value={style.textColor}
        />
        <BuilderColorInput
          label="Fundo"
          onChange={(value) => updateStyle("backgroundColor", value)}
          value={style.backgroundColor}
        />
        <BuilderSelectInput
          label="Espacamento interno"
          onChange={(value) => updateStyle("padding", value)}
          options={spacingOptions}
          value={style.padding ?? "none"}
        />
        <BuilderSelectInput
          label="Espacamento externo"
          onChange={(value) => updateStyle("margin", value)}
          options={spacingOptions}
          value={style.margin ?? "none"}
        />
        <BuilderColorInput
          label="Cor da borda"
          onChange={(value) => updateStyle("borderColor", value)}
          value={style.borderColor}
        />
        <BuilderNumberInput
          label="Largura da borda"
          max={12}
          min={0}
          onChange={(value) => updateStyle("borderWidth", value)}
          value={style.borderWidth ?? 0}
        />
        <BuilderSelectInput
          label="Raio da borda"
          onChange={(value) => updateStyle("borderRadius", value)}
          options={radiusOptions}
          value={style.borderRadius ?? "none"}
        />
        <BuilderSelectInput
          label="Sombra"
          onChange={(value) => updateStyle("shadow", value)}
          options={shadowOptions}
          value={style.shadow ?? "none"}
        />
        <BuilderTextInput
          label="Altura minima"
          onChange={(value) => updateStyle("minHeight", value)}
          placeholder="Ex: 320px"
          value={style.minHeight}
        />
        <BuilderTextInput
          label="Altura maxima"
          onChange={(value) => updateStyle("maxHeight", value)}
          placeholder="Ex: 640px"
          value={style.maxHeight}
        />
        <BuilderSelectInput
          label="Animacao"
          onChange={(value) => updateStyle("animation", value)}
          options={animationOptions}
          value={style.animation ?? "none"}
        />
        <BuilderNumberInput
          label="Duracao"
          max={10}
          min={0}
          onChange={(value) => updateStyle("animationDuration", value)}
          value={style.animationDuration ?? 0.5}
        />
        <BuilderNumberInput
          label="Atraso"
          max={10}
          min={0}
          onChange={(value) => updateStyle("animationDelay", value)}
          value={style.animationDelay ?? 0}
        />
      </EditorStack>
    </section>
  );
}
