"use client";

import type { ComponentStyleProps } from "@centroimovel/types";
import { motion } from "framer-motion";
import { useContext } from "react";
import { auroraFadeIn } from "../../templates/aurora/aurora-variants";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import {
  defaultTextColorForTextBlock,
  relativeLuminance,
  solidBackgroundHexFromStyle,
} from "./text-block-colors";
import { TextBlockMarkdown } from "./TextBlockMarkdown";

const textAlignMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

interface BuilderTextBlockProps {
  content?: string;
  alignment?: "left" | "center" | "right";
  maxWidth?: "sm" | "md" | "lg" | "full";
  headingColor?: string;
  subheadingColor?: string;
  bodyTextColor?: string;
  listTextColor?: string;
  linkTextColor?: string;
  codeTextColor?: string;
  style?: ComponentStyleProps;
}

const maxWidthMap = {
  sm: "640px",
  md: "800px",
  lg: "1000px",
  full: "100%",
};

export function BuilderTextBlock({
  content = "",
  alignment = "left",
  maxWidth = "md",
  headingColor,
  subheadingColor,
  bodyTextColor,
  listTextColor,
  linkTextColor,
  codeTextColor,
  style,
}: BuilderTextBlockProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const textBlockViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });
  const resolvedText = style?.textColor ?? defaultTextColorForTextBlock(style);
  const { textAlign: _textAlignIgnored, ...styleRest } = style ?? {};
  const mergedStyle = {
    ...styleRest,
    textColor: resolvedText,
  } as ComponentStyleProps;
  const sectionBgHex = solidBackgroundHexFromStyle(style);
  const useInvertProse =
    sectionBgHex !== undefined && relativeLuminance(sectionBgHex) <= 0.45;

  if (!content) {
    return (
      <SectionSurface style={mergedStyle} className="px-6 py-16 md:px-12">
        <div className="mx-auto text-center opacity-30 py-12 border-2 border-dashed border-white/10 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            Texto vazio — clique para editar
          </p>
        </div>
      </SectionSurface>
    );
  }

  return (
    <SectionSurface style={mergedStyle} className="px-6 py-16 md:px-12">
      <motion.div
        variants={auroraFadeIn("up")}
        initial="hidden"
        whileInView="show"
        viewport={textBlockViewport}
        className={`mx-auto ${textAlignMap[alignment]} leading-relaxed`}
        style={{ maxWidth: maxWidthMap[maxWidth] }}
      >
        <TextBlockMarkdown
          content={content}
          invert={useInvertProse}
          textAlign={alignment}
          baseTextColor={resolvedText}
          markdownColors={{
            headingColor,
            subheadingColor,
            bodyTextColor,
            listTextColor,
            linkTextColor,
            codeTextColor,
          }}
        />
      </motion.div>
    </SectionSurface>
  );
}
