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
  const direction = textProp(props.direction) ?? "column";
  const directionClass =
    direction === "row" ? "flex-col md:flex-row" : "flex-col";
  return (
    <section
      className={cx(
        "flex rounded-lg border border-line bg-panel p-5",
        directionClass,
        classForGap(props.gap),
      )}
    >
      {context.renderBlocks(componentArrayProp(props.children), "contents")}
    </section>
  );
}

export function SectionWrapperBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const widthClass = boolProp(props.fullWidth)
    ? "w-full"
    : `${classForMaxWidth(props.maxWidth)} mx-auto w-full`;
  return (
    <section
      className={cx(widthClass, "rounded-lg border border-line bg-panel p-5")}
    >
      {context.renderBlocks(componentArrayProp(props.children))}
    </section>
  );
}

export function TwoColumnBlock({ component, context }: BuilderBlockProps) {
  const props = component.props;
  const leftWidth = clamp(numberProp(props.leftColumnWidth, 50), 20, 80);
  const rightWidth = Math.max(20, 100 - leftWidth);
  const style = {
    "--page-builder-two-column-template": `${leftWidth}fr ${rightWidth}fr`,
  } as CSSProperties;
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
        {context.renderBlocks(componentArrayProp(props.leftChildren))}
      </div>
      <div className="page-builder-two-column-right min-w-0">
        {context.renderBlocks(componentArrayProp(props.rightChildren))}
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
