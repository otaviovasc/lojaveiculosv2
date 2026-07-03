import {
  BuilderNumberInput,
  BuilderSelectInput,
  BuilderTextInput,
  BuilderToggleInput,
  recordArray,
  recordValue,
  textArray,
  type BuilderRecord,
} from "./BuilderBlockEditorFields";
import {
  BuilderTestimonialsItems,
  BuilderTextItems,
} from "./BuilderBlockEditorLists";
import {
  alignOptions,
  buttonStyleOptions,
  EditorStack,
  fieldLabel,
  TitleSubtitleFields,
  type SetProp,
} from "./BuilderBlockEditorShared";

type PropsEditor = {
  props: BuilderRecord;
  setProp: SetProp;
};

export function TestimonialsBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextInput
        label="Título"
        onChange={(value) => setProp("title", value)}
        value={props.title}
      />
      <BuilderTestimonialsItems
        items={recordArray(props.testimonials)}
        onChange={(items) => setProp("testimonials", items)}
      />
    </EditorStack>
  );
}

export function FeaturedVehiclesBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <TitleSubtitleFields props={props} setProp={setProp} />
      <BuilderNumberInput
        label="Quantidade"
        max={12}
        min={1}
        onChange={(value) => setProp("maxProperties", value)}
        value={props.maxProperties ?? props.limit ?? 6}
      />
      <BuilderToggleInput
        label="Mostrar link para estoque"
        onChange={(value) => setProp("showAllLink", value)}
        value={props.showAllLink}
      />
    </EditorStack>
  );
}

export function CtaBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <TitleSubtitleFields props={props} setProp={setProp} />
      <BuilderTextInput
        label="Texto do botão"
        onChange={(value) => setProp("buttonLabel", value)}
        value={props.buttonLabel ?? props.label}
      />
      <BuilderTextInput
        label="Link"
        onChange={(value) => setProp("buttonUrl", value)}
        value={props.buttonUrl}
      />
      <BuilderSelectInput
        label="Estilo"
        onChange={(value) => setProp("buttonStyle", value)}
        options={buttonStyleOptions}
        value={props.buttonStyle ?? "primary"}
      />
    </EditorStack>
  );
}

export function ContactSectionBlockEditor({ props, setProp }: PropsEditor) {
  const fields = recordValue(props.fields);
  return (
    <EditorStack>
      <TitleSubtitleFields props={props} setProp={setProp} />
      <BuilderTextInput
        label="Texto do botão"
        onChange={(value) => setProp("submitButtonText", value)}
        value={props.submitButtonText}
      />
      <BuilderTextInput
        label="Mensagem de sucesso"
        onChange={(value) => setProp("successMessage", value)}
        value={props.successMessage}
      />
      {["name", "phone", "email", "message"].map((key) => (
        <BuilderToggleInput
          key={key}
          label={`Campo ${fieldLabel(key)}`}
          onChange={(value) => setProp("fields", { ...fields, [key]: value })}
          value={fields[key]}
        />
      ))}
    </EditorStack>
  );
}

export function TypewriterBlockEditor({ props, setProp }: PropsEditor) {
  return (
    <EditorStack>
      <BuilderTextInput
        label="Texto antes"
        onChange={(value) => setProp("preText", value)}
        value={props.preText}
      />
      <BuilderTextItems
        items={textArray(props.texts)}
        label="Textos animados"
        onChange={(items) => setProp("texts", items)}
      />
      <BuilderTextInput
        label="Texto depois"
        onChange={(value) => setProp("postText", value)}
        value={props.postText}
      />
      <BuilderNumberInput
        label="Velocidade"
        max={200}
        min={20}
        onChange={(value) => setProp("speed", value)}
        value={props.speed ?? 70}
      />
      <BuilderNumberInput
        label="Espera"
        max={5000}
        min={500}
        onChange={(value) => setProp("waitTime", value)}
        value={props.waitTime ?? 1800}
      />
      <BuilderSelectInput
        label="Posicao"
        onChange={(value) => setProp("textPosition", value)}
        options={alignOptions}
        value={props.textPosition ?? "center"}
      />
      <BuilderToggleInput
        label="Mostrar cursor"
        onChange={(value) => setProp("showCursor", value)}
        value={props.showCursor}
      />
    </EditorStack>
  );
}
