import type { ReactNode } from "react";
import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import {
  BuilderTextareaInput,
  BuilderTextInput,
  type BuilderRecord,
} from "./BuilderBlockEditorFields";

export const alignOptions = [
  { label: "Esquerda", value: "left" },
  { label: "Centro", value: "center" },
  { label: "Direita", value: "right" },
] as const;

export const buttonStyleOptions = [
  { label: "Primario", value: "primary" },
  { label: "Contorno", value: "outline" },
  { label: "Suave", value: "soft" },
] as const;

export const gapOptions = [
  { label: "Pequeno", value: "sm" },
  { label: "Medio", value: "md" },
  { label: "Grande", value: "lg" },
  { label: "Extra", value: "xl" },
] as const;

export const imagePositionOptions = [
  { label: "Esquerda", value: "left" },
  { label: "Direita", value: "right" },
] as const;

export const lineVariantOptions = [
  { label: "Solida", value: "solid" },
  { label: "Tracejada", value: "dashed" },
  { label: "Pontilhada", value: "dotted" },
  { label: "Destaque", value: "accent" },
] as const;

export const layoutOptions = [
  { label: "Grade", value: "grid" },
  { label: "Mosaico", value: "mosaic" },
  { label: "Carrossel", value: "carousel" },
] as const;

export const maxWidthOptions = [
  { label: "Medio", value: "md" },
  { label: "Grande", value: "lg" },
  { label: "Tela", value: "xl" },
] as const;

export const speedOptions = [
  { label: "Lento", value: "slow" },
  { label: "Normal", value: "normal" },
  { label: "Rapido", value: "fast" },
] as const;

export const videoProviderOptions = [
  { label: "YouTube", value: "youtube" },
  { label: "Arquivo de video", value: "file" },
] as const;

export type SetProp = (key: string, value: unknown) => void;

export type EditorHelpers = {
  component: StorefrontBuilderComponent;
  setProp: SetProp;
};

export type NestedEditorRenderer = (
  child: StorefrontBuilderComponent,
  updateChild: (component: StorefrontBuilderComponent) => void,
) => ReactNode;

export function TitleSubtitleFields({
  props,
  setProp,
}: {
  props: BuilderRecord;
  setProp: SetProp;
}) {
  return (
    <>
      <BuilderTextInput
        label="Título"
        onChange={(value) => setProp("title", value)}
        value={props.title}
      />
      <BuilderTextareaInput
        label="Subtítulo"
        onChange={(value) => setProp("subtitle", value)}
        value={props.subtitle ?? props.text}
      />
    </>
  );
}

export function EditorStack({ children }: { children: ReactNode }) {
  return <div className="mt-3 grid gap-3">{children}</div>;
}

export function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    email: "email",
    message: "mensagem",
    name: "nome",
    phone: "telefone",
  };
  return labels[key] ?? key;
}
