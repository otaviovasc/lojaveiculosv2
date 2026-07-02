import {
  BuilderNumberInput,
  BuilderImageInput,
  BuilderSelectInput,
  BuilderTextareaInput,
  BuilderTextInput,
  BuilderToggleInput,
  recordArray,
  type BuilderRecord,
} from "./BuilderBlockEditorFields";
import { BuilderImageItems } from "./BuilderBlockEditorLists";
import {
  alignOptions,
  EditorStack,
  gapOptions,
  imagePositionOptions,
  layoutOptions,
  maxWidthOptions,
  TitleSubtitleFields,
  videoProviderOptions,
  type SetProp,
} from "./BuilderBlockEditorShared";

type PropsEditor = {
  props: BuilderRecord;
  setProp: SetProp;
};

export function HeroBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextInput
        label="Titulo"
        onChange={(value) => setProp("title", value)}
        value={props.title}
      />
      <BuilderTextareaInput
        label="Subtitulo"
        onChange={(value) => setProp("subtitle", value)}
        value={props.subtitle}
      />
      <BuilderTextInput
        label="Etiqueta"
        onChange={(value) => setProp("badge", value)}
        value={props.badge ?? props.eyebrow}
      />
      <BuilderTextInput
        label="Texto do botao"
        onChange={(value) => setProp("ctaLabel", value)}
        value={props.ctaLabel ?? props.primaryLabel}
      />
      <BuilderTextInput
        label="Link do botao"
        onChange={(value) => setProp("ctaUrl", value)}
        value={props.ctaUrl}
      />
      <BuilderImageInput
        label="Imagem"
        onChange={(value) => setProp("imageUrl", value)}
        value={props.imageUrl}
      />
      <BuilderToggleInput
        label="Altura cheia"
        onChange={(value) => setProp("fullHeight", value)}
        value={props.fullHeight}
      />
    </EditorStack>
  );
}

export function AboutBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextInput
        label="Titulo"
        onChange={(value) => setProp("title", value)}
        value={props.title}
      />
      <BuilderTextareaInput
        label="Texto"
        onChange={(value) => setProp("text", value)}
        value={props.text}
      />
      <BuilderImageInput
        label="Imagem"
        onChange={(value) => setProp("imageUrl", value)}
        value={props.imageUrl}
      />
      <BuilderSelectInput
        label="Posicao da imagem"
        onChange={(value) => setProp("imagePosition", value)}
        options={imagePositionOptions}
        value={props.imagePosition ?? "right"}
      />
    </EditorStack>
  );
}

export function TextBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextareaInput
        label="Conteudo"
        onChange={(value) => setProp("content", value)}
        value={props.content ?? props.text}
      />
      <BuilderSelectInput
        label="Alinhamento"
        onChange={(value) => setProp("alignment", value)}
        options={alignOptions}
        value={props.alignment ?? "left"}
      />
      <BuilderSelectInput
        label="Largura"
        onChange={(value) => setProp("maxWidth", value)}
        options={maxWidthOptions}
        value={props.maxWidth ?? "lg"}
      />
    </EditorStack>
  );
}

export function ImageBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderImageInput
        label="Imagem"
        onChange={(value) => setProp("imageUrl", value)}
        value={props.imageUrl ?? props.url}
      />
      <BuilderTextInput
        label="Legenda"
        onChange={(value) => setProp("caption", value)}
        value={props.caption}
      />
      <BuilderSelectInput
        label="Alinhamento"
        onChange={(value) => setProp("alignment", value)}
        options={alignOptions}
        value={props.alignment ?? "center"}
      />
      <BuilderToggleInput
        label="Abrir em lightbox"
        onChange={(value) => setProp("lightboxEnabled", value)}
        value={props.lightboxEnabled}
      />
    </EditorStack>
  );
}

export function GalleryBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <TitleSubtitleFields props={props} setProp={setProp} />
      <BuilderSelectInput
        label="Layout"
        onChange={(value) => setProp("layout", value)}
        options={layoutOptions}
        value={props.layout ?? "grid"}
      />
      <BuilderNumberInput
        label="Colunas"
        max={4}
        min={1}
        onChange={(value) => setProp("columns", value)}
        value={props.columns ?? 3}
      />
      <BuilderSelectInput
        label="Espacamento"
        onChange={(value) => setProp("gap", value)}
        options={gapOptions}
        value={props.gap ?? "md"}
      />
      <BuilderToggleInput
        label="Mostrar legendas"
        onChange={(value) => setProp("showCaptions", value)}
        value={props.showCaptions}
      />
      <BuilderToggleInput
        label="Abrir em lightbox"
        onChange={(value) => setProp("lightboxEnabled", value)}
        value={props.lightboxEnabled}
      />
      <BuilderImageItems
        items={recordArray(props.images)}
        onChange={(items) => setProp("images", items)}
      />
    </EditorStack>
  );
}

export function VideoBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextInput
        label="Video"
        onChange={(value) => setProp("videoUrl", value)}
        value={props.videoUrl ?? props.url}
      />
      <BuilderSelectInput
        label="Provider"
        onChange={(value) => setProp("provider", value)}
        options={videoProviderOptions}
        value={props.provider ?? "youtube"}
      />
      <BuilderToggleInput
        label="Autoplay"
        onChange={(value) => setProp("autoplay", value)}
        value={props.autoplay}
      />
      <BuilderToggleInput
        label="Loop"
        onChange={(value) => setProp("loop", value)}
        value={props.loop}
      />
      <BuilderToggleInput
        label="Sem som"
        onChange={(value) => setProp("muted", value)}
        value={props.muted}
      />
    </EditorStack>
  );
}
