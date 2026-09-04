import type { NodeViewProps } from "@tiptap/react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { createElement } from "react";
import { getVariableMeta } from "./DocumentRichTextBlockEditor";

function VariableChipView({ node }: NodeViewProps) {
  const token = String(node.attrs.token ?? "");
  const meta = getVariableMeta(token);
  return createElement(
    NodeViewWrapper,
    {
      as: "span",
      className: "documents-variable-inline-chip",
      "data-token": token,
      "data-variable-chip": "",
      title: token,
    },
    createElement(meta.icon, {
      className: "documents-variable-inline-chip-icon",
    }),
    createElement("span", null, meta.label),
  );
}

export const VariableChip = Node.create({
  name: "variableChip",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

  addAttributes() {
    return {
      token: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-token") ?? "",
        renderHTML: (attributes) => ({
          "data-token": attributes.token as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable-chip]",
        getAttrs: (element) => ({
          token: element.getAttribute("data-token") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const token = String(node.attrs.token ?? "");
    return [
      "span",
      {
        class: "documents-variable-inline-chip",
        "data-token": token,
        "data-variable-chip": "",
      },
      token,
    ];
  },

  renderText({ node }) {
    return String(node.attrs.token ?? "");
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableChipView);
  },
});
