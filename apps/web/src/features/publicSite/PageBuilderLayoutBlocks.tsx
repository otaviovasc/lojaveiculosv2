import type { CSSProperties } from "react";
import { cx } from "../../components/ui/featureShared";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import {
  boolProp,
  classForGap,
  classForMaxWidth,
  componentArrayProp,
  numberProp,
  textProp,
} from "./pageBuilderRenderUtils";

export function ContainerBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const children = componentArrayProp(props.children);
  const direction = textProp(props.direction) ?? "column";
  const directionClass =
    direction === "row" ? "flex-col md:flex-row" : "flex-col";
  if (!children.length && !context.preview) return null;
  return (
    <section
      className={cx(
        "public-storefront-shell flex px-4 py-8 md:px-6",
        directionClass,
        classForGap(props.gap),
      )}
    >
      {children.length ? (
        context.renderBlocks(children, "contents")
      ) : (
        <LayoutEmptySlot label="Container vazio" />
      )}
    </section>
  );
}

export function SectionWrapperBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const children = componentArrayProp(props.children);
  const widthClass = boolProp(props.fullWidth)
    ? "w-full"
    : `${classForMaxWidth(props.maxWidth)} mx-auto w-full`;
  if (!children.length && !context.preview) return null;
  return (
    <section className={cx(widthClass, "px-4 py-8 md:px-6")}>
      {children.length ? (
        context.renderBlocks(children)
      ) : (
        <LayoutEmptySlot label="Secao vazia" />
      )}
    </section>
  );
}

export function TwoColumnBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const leftChildren = componentArrayProp(props.leftChildren);
  const rightChildren = componentArrayProp(props.rightChildren);
  const leftWidth = clamp(numberProp(props.leftColumnWidth, 50), 20, 80);
  const rightWidth = Math.max(20, 100 - leftWidth);
  const style = {
    "--page-builder-two-column-template": `${leftWidth}fr ${rightWidth}fr`,
  } as CSSProperties;
  if (!leftChildren.length && !rightChildren.length && !context.preview) {
    return null;
  }
  return (
    <section
      className={cx(
        "page-builder-two-column",
        boolProp(props.reverseOnMobile) &&
          "page-builder-two-column--reverse-mobile",
        classForGap(props.gap),
      )}
      style={style}
    >
      <div className="page-builder-two-column-left min-w-0">
        {leftChildren.length ? (
          context.renderBlocks(leftChildren)
        ) : (
          <LayoutEmptySlot label="Coluna esquerda" />
        )}
      </div>
      <div className="page-builder-two-column-right min-w-0">
        {rightChildren.length ? (
          context.renderBlocks(rightChildren)
        ) : (
          <LayoutEmptySlot label="Coluna direita" />
        )}
      </div>
    </section>
  );
}

function LayoutEmptySlot({ label }: { label: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-line bg-panel/70 p-6 text-center">
      <span className="text-xs font-black uppercase tracking-[0.24em] text-muted">
        {label}
      </span>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
