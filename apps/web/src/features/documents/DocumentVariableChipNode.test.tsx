// @vitest-environment jsdom
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import { getVariableMeta } from "./DocumentRichTextBlockEditor";
import { VariableChip } from "./DocumentVariableChipNode";

describe("VariableChip round-trip", () => {
  it("parses chip spans and serializes back to raw tokens", () => {
    const editor = new Editor({
      content:
        '<p>Entre <span data-variable-chip data-token="{{store.address}}">{{store.address}}</span> e {{buyer.name}}.</p>',
      element: document.createElement("div"),
      extensions: [StarterKit, VariableChip],
    });
    expect(editor.getText()).toBe("Entre {{store.address}} e {{buyer.name}}.");
    editor.destroy();
  });

  it("inserts a chip node that serializes to the raw token", () => {
    const editor = new Editor({
      content: "<p>A B</p>",
      element: document.createElement("div"),
      extensions: [StarterKit, VariableChip],
    });
    editor
      .chain()
      .focus()
      .setTextSelection(2)
      .insertContent({
        type: "variableChip",
        attrs: { token: "{{finance.salePrice}}" },
      })
      .run();
    expect(editor.getText()).toBe("A{{finance.salePrice}} B");
    editor.destroy();
  });

  it("maps real catalog tokens to friendly labels", () => {
    expect(getVariableMeta("{{store.address}}").label).toBe("Endereço da Loja");
    expect(getVariableMeta("{{store.cityState}}").label).toBe(
      "Cidade/UF da Loja",
    );
    expect(getVariableMeta("{{finance.salePrice}}").label).toBe(
      "Valor da Venda",
    );
    expect(getVariableMeta("{{document.issuedAt}}").label).toBe(
      "Data de Emissão",
    );
    expect(getVariableMeta("{{vehicle.title}}").label).toBe("Veículo");
    expect(getVariableMeta("{{vehicle.label}}").label).toBe("Veículo");
    expect(getVariableMeta("{{vehicle.km}}").label).toBe("Quilometragem");
    expect(getVariableMeta("{{driver.document}}").label).toBe(
      "CPF do Condutor",
    );
  });
});
