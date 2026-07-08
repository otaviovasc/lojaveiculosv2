import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Redo2, Undo2, Variable } from "lucide-react";
import { useEffect, useMemo } from "react";
import { sampleVariable } from "./documentBuilderModel";

export function DocumentRichTextBlockEditor({
  onChange,
  placeholder,
  value,
  variables,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  variables: readonly string[];
}) {
  const extensions = useMemo(
    () => [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder],
  );
  const editor = useEditor({
    content: toHtml(value),
    editorProps: {
      attributes: {
        class: "documents-builder-rich-text-prose",
      },
    },
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getText()),
  });

  useEffect(() => {
    if (!editor || editor.getText() === value) return;
    editor.commands.setContent(toHtml(value));
  }, [editor, value]);

  return (
    <div className="documents-builder-rich-text">
      <div
        aria-label="Ferramentas do bloco"
        className="documents-builder-rich-toolbar"
        role="toolbar"
      >
        <button
          aria-label="Desfazer"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
          title="Desfazer"
          type="button"
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </button>
        <button
          aria-label="Refazer"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
          title="Refazer"
          type="button"
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </button>
        <span className="documents-builder-rich-separator" />
        <Variable aria-hidden="true" className="size-4 text-muted" />
        <div className="documents-builder-variable-strip">
          {variables.map((variable) => (
            <button
              key={variable}
              onClick={() =>
                editor?.chain().focus().insertContent(variable).run()
              }
              title={sampleVariable(variable)}
              type="button"
            >
              {variable}
            </button>
          ))}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function toHtml(value: string) {
  return `<p>${escapeHtml(value)}</p>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
