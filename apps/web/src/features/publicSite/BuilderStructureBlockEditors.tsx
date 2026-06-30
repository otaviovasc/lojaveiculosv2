import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import {
  BuilderNumberInput,
  BuilderSelectInput,
  BuilderTextInput,
  BuilderToggleInput,
  recordArray,
} from "./BuilderBlockEditorFields";
import {
  BuilderFooterColumns,
  BuilderLinksList,
} from "./BuilderBlockEditorLists";
import { BuilderNestedComponentsEditor } from "./BuilderNestedComponentsEditor";
import {
  EditorStack,
  gapOptions,
  lineVariantOptions,
  maxWidthOptions,
  speedOptions,
  TitleSubtitleFields,
  type EditorHelpers,
  type NestedEditorRenderer,
} from "./BuilderBlockEditorShared";

export function HeaderFooterEditor({ component, setProp }: EditorHelpers) {
  const props = component.props;
  if (component.type === "footer") {
    return (
      <EditorStack>
        <BuilderToggleInput
          label="Mostrar redes sociais"
          onChange={(value) => setProp("showSocial", value)}
          value={props.showSocial}
        />
        <BuilderFooterColumns
          items={recordArray(props.columns)}
          onChange={(items) => setProp("columns", items)}
        />
      </EditorStack>
    );
  }
  return (
    <EditorStack>
      <BuilderTextInput
        label="Logo texto"
        onChange={(value) => setProp("logoText", value)}
        value={props.logoText}
      />
      <BuilderToggleInput
        label="Fixo no topo"
        onChange={(value) => setProp("sticky", value)}
        value={props.sticky}
      />
      <BuilderToggleInput
        label="Mostrar botao de contato"
        onChange={(value) => setProp("showContactButton", value)}
        value={props.showContactButton}
      />
      <BuilderToggleInput
        label="Mostrar redes sociais"
        onChange={(value) => setProp("showSocial", value)}
        value={props.showSocial}
      />
      <BuilderTextInput
        label="Texto do botao"
        onChange={(value) => setProp("contactButtonText", value)}
        value={props.contactButtonText}
      />
      <BuilderTextInput
        label="Link do botao"
        onChange={(value) => setProp("contactButtonLink", value)}
        value={props.contactButtonLink}
      />
      <BuilderLinksList
        items={recordArray(props.links)}
        label="Links"
        onChange={(items) => setProp("links", items)}
      />
    </EditorStack>
  );
}

export function NestedLayoutEditor({
  component,
  renderNestedEditor,
  setChildren,
  setProp,
}: EditorHelpers & {
  renderNestedEditor: NestedEditorRenderer;
  setChildren: (key: string, value: StorefrontBuilderComponent[]) => void;
}) {
  const props = component.props;
  if (component.type === "two_column") {
    return (
      <EditorStack>
        <BuilderNumberInput
          label="Coluna esquerda"
          max={80}
          min={20}
          onChange={(value) => setProp("leftColumnWidth", value)}
          value={props.leftColumnWidth ?? 50}
        />
        <BuilderSelectInput
          label="Espacamento"
          onChange={(value) => setProp("gap", value)}
          options={gapOptions}
          value={props.gap ?? "lg"}
        />
        <BuilderToggleInput
          label="Inverter no mobile"
          onChange={(value) => setProp("reverseOnMobile", value)}
          value={props.reverseOnMobile}
        />
        <BuilderNestedComponentsEditor
          components={
            recordArray(props.leftChildren) as StorefrontBuilderComponent[]
          }
          label="Coluna esquerda"
          onChange={(items) => setChildren("leftChildren", items)}
          renderEditor={renderNestedEditor}
        />
        <BuilderNestedComponentsEditor
          components={
            recordArray(props.rightChildren) as StorefrontBuilderComponent[]
          }
          label="Coluna direita"
          onChange={(items) => setChildren("rightChildren", items)}
          renderEditor={renderNestedEditor}
        />
      </EditorStack>
    );
  }
  return (
    <EditorStack>
      {component.type === "container" ? (
        <>
          <BuilderSelectInput
            label="Direcao"
            onChange={(value) => setProp("direction", value)}
            options={[
              { label: "Vertical", value: "column" },
              { label: "Horizontal", value: "row" },
            ]}
            value={props.direction ?? "column"}
          />
          <BuilderSelectInput
            label="Espacamento"
            onChange={(value) => setProp("gap", value)}
            options={gapOptions}
            value={props.gap ?? "lg"}
          />
        </>
      ) : (
        <>
          <BuilderToggleInput
            label="Largura total"
            onChange={(value) => setProp("fullWidth", value)}
            value={props.fullWidth}
          />
          <BuilderSelectInput
            label="Largura maxima"
            onChange={(value) => setProp("maxWidth", value)}
            options={maxWidthOptions}
            value={props.maxWidth ?? "lg"}
          />
        </>
      )}
      <BuilderNestedComponentsEditor
        components={recordArray(props.children) as StorefrontBuilderComponent[]}
        label="Blocos internos"
        onChange={(items) => setChildren("children", items)}
        renderEditor={renderNestedEditor}
      />
    </EditorStack>
  );
}

export function SimpleBlockEditor({ component, setProp }: EditorHelpers) {
  const props = component.props;
  if (component.type === "spacer") {
    return (
      <BuilderSelectInput
        label="Altura"
        onChange={(value) => setProp("height", value)}
        options={gapOptions}
        value={props.height ?? "lg"}
      />
    );
  }
  if (component.type === "divider") {
    return (
      <EditorStack>
        <BuilderTextInput
          label="Texto"
          onChange={(value) => setProp("text", value)}
          value={props.text}
        />
        <BuilderSelectInput
          label="Linha"
          onChange={(value) => setProp("lineVariant", value)}
          options={lineVariantOptions}
          value={props.lineVariant ?? "solid"}
        />
      </EditorStack>
    );
  }
  if (component.type === "map") {
    return (
      <EditorStack>
        <BuilderTextInput
          label="Endereco"
          onChange={(value) => setProp("address", value)}
          value={props.address}
        />
        <BuilderNumberInput
          label="Zoom"
          max={20}
          min={1}
          onChange={(value) => setProp("zoom", value)}
          value={props.zoom ?? 15}
        />
      </EditorStack>
    );
  }
  if (component.type === "marquee") {
    return (
      <EditorStack>
        <BuilderTextInput
          label="Texto"
          onChange={(value) => setProp("text", value)}
          value={props.text}
        />
        <BuilderSelectInput
          label="Velocidade"
          onChange={(value) => setProp("speed", value)}
          options={speedOptions}
          value={props.speed ?? "normal"}
        />
        <BuilderSelectInput
          label="Direcao"
          onChange={(value) => setProp("direction", value)}
          options={[
            { label: "Esquerda", value: "left" },
            { label: "Direita", value: "right" },
          ]}
          value={props.direction ?? "left"}
        />
      </EditorStack>
    );
  }
  return (
    <EditorStack>
      <TitleSubtitleFields props={props} setProp={setProp} />
      <BuilderTextInput
        label="Imagem"
        onChange={(value) => setProp("imageUrl", value)}
        value={props.imageUrl}
      />
    </EditorStack>
  );
}
