import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { cx } from "../../components/ui/featureShared";
import { PageBuilderPreviewEmptyState } from "./PageBuilderEmptyState";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import { boolProp, textProp } from "./pageBuilderRenderUtils";

export function ImageBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const [open, setOpen] = useState(false);
  const imageUrl = textProp(props.imageUrl) ?? textProp(props.url);
  if (!imageUrl) {
    return context.preview ? (
      <PageBuilderPreviewEmptyState
        icon={ImageIcon}
        title="Imagem sem arquivo"
        text="Adicione uma foto do estoque, showroom ou entrega."
      />
    ) : null;
  }
  const alignment = textProp(props.alignment) ?? "center";
  const figureClass =
    alignment === "left"
      ? "mr-auto"
      : alignment === "right"
        ? "ml-auto"
        : "mx-auto";
  const enableLightbox = boolProp(props.lightboxEnabled, true);
  return (
    <>
      <figure
        className={cx(
          "group public-storefront-shell overflow-hidden rounded-xl border border-line bg-panel shadow-md",
          figureClass,
          alignment !== "center" && "max-w-4xl",
        )}
      >
        <button
          className={cx(
            "block w-full overflow-hidden text-left",
            enableLightbox && "cursor-zoom-in",
          )}
          disabled={!enableLightbox}
          onClick={() => setOpen(true)}
          type="button"
        >
          <img
            alt={textProp(props.alt) ?? textProp(props.caption) ?? ""}
            className="max-h-[36rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            src={imageUrl}
          />
        </button>
        {textProp(props.caption) ? (
          <figcaption className="border-t border-line/60 p-4 text-xs font-bold uppercase tracking-wider text-muted">
            {textProp(props.caption)}
          </figcaption>
        ) : null}
      </figure>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-app-text/90 p-4 backdrop-blur-sm">
          <button
            aria-label="Fechar imagem"
            className="absolute right-6 top-6 rounded-full border border-line bg-panel p-3 text-app-text shadow-lg transition-transform hover:scale-105 active:scale-95"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <img
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-2xl border border-line/10 object-contain shadow-2xl"
            src={imageUrl}
          />
        </div>
      ) : null}
    </>
  );
}
