"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderTypewriterProps {
  texts?: string[];
  speed?: number;
  initialDelay?: number;
  waitTime?: number;
  deleteSpeed?: number;
  loop?: boolean;
  showCursor?: boolean;
  cursorChar?: string;
  preText?: string;
  postText?: string;
  textPosition?: "center" | "left" | "right";
  staticTextColor?: string;
  typewriterColor?: string;
  fontSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  bigText?: boolean;
  style?: ComponentStyleProps;
  config: StoreConfig;
}

const fontSizeClasses = {
  sm: "text-lg sm:text-xl",
  md: "text-2xl sm:text-3xl",
  lg: "text-3xl sm:text-4xl",
  xl: "text-4xl sm:text-5xl",
  "2xl": "text-5xl sm:text-7xl md:text-8xl",
};

/** Map `ComponentStyleProps.fontSize` tokens to the nearest typewriter scale. */
const STYLE_FONT_TO_CLASS: Partial<
  Record<
    NonNullable<ComponentStyleProps["fontSize"]>,
    keyof typeof fontSizeClasses
  >
> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  base: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
  "3xl": "2xl",
  "4xl": "2xl",
  "5xl": "2xl",
};

export function BuilderTypewriter({
  texts = ["Texto 1", "Texto 2", "Texto 3"],
  speed = 70,
  initialDelay = 0,
  waitTime = 2000,
  deleteSpeed = 40,
  loop = true,
  showCursor = true,
  cursorChar = "_",
  preText = "",
  postText = "",
  textPosition = "center",
  staticTextColor = "#1A1A1A",
  typewriterColor = "#C9A84C",
  fontSize = "2xl",
  bigText = true,
  style,
  config,
}: BuilderTypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const currentText = texts[currentTextIndex] || "";

    const startTyping = () => {
      if (isDeleting) {
        if (displayText === "") {
          setIsDeleting(false);
          if (currentTextIndex === texts.length - 1 && !loop) {
            return;
          }
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          setCurrentIndex(0);
          timeout = setTimeout(() => {}, waitTime);
        } else {
          timeout = setTimeout(() => {
            setDisplayText((prev) => prev.slice(0, -1));
          }, deleteSpeed);
        }
      } else {
        if (currentIndex < currentText.length) {
          timeout = setTimeout(() => {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          }, speed);
        } else if (texts.length > 1 || loop) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, waitTime);
        }
      }
    };

    if (currentIndex === 0 && !isDeleting && displayText === "") {
      timeout = setTimeout(startTyping, initialDelay);
    } else {
      startTyping();
    }

    return () => clearTimeout(timeout);
  }, [
    currentIndex,
    displayText,
    isDeleting,
    speed,
    deleteSpeed,
    waitTime,
    texts,
    currentTextIndex,
    loop,
    initialDelay,
  ]);

  const rowAlignClass = {
    center: "items-center",
    left: "items-start",
    right: "items-end",
  };

  const bottomRowJustify = {
    center: "justify-center",
    left: "justify-start",
    right: "justify-end",
  };

  const textAlignClass = {
    center: "text-center",
    left: "text-left",
    right: "text-right",
  };

  const cursorVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.01,
        repeat: Infinity,
        repeatDelay: 0.4,
        repeatType: "reverse",
      },
    },
  };

  const resolvedFontSize =
    (style?.fontSize && STYLE_FONT_TO_CLASS[style.fontSize]) || fontSize;
  const textClasses = cn(
    "tracking-tighter",
    fontSizeClasses[resolvedFontSize],
    bigText && "font-black leading-[1.05]",
  );

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const staticColor = staticTextColor || resolvedTextColor;
  const accentColor = typewriterColor || config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );

  return (
    <SectionSurface
      style={style}
      className="w-full"
      innerClassName={cn(
        "relative flex w-full flex-col gap-4 py-16 px-6 md:px-12",
        rowAlignClass[textPosition],
      )}
    >
      {preText ? (
        <div
          className={cn(
            "max-w-full text-balance opacity-60",
            textAlignClass[textPosition],
            textClasses,
          )}
          style={{ fontFamily: headingFont }}
        >
          <span style={{ color: staticColor }}>{preText}</span>
        </div>
      ) : null}

      <div
        className={cn("flex w-full max-w-full", bottomRowJustify[textPosition])}
      >
        <span
          className={cn(
            "inline-flex max-w-full flex-nowrap items-baseline gap-x-2",
            textClasses,
          )}
          style={{ fontFamily: headingFont }}
        >
          <span
            className="whitespace-pre-wrap drop-shadow-2xl"
            style={{ color: accentColor }}
          >
            {displayText}
          </span>
          {showCursor ? (
            <motion.span
              variants={cursorVariants}
              initial="initial"
              animate="animate"
              className="inline-block shrink-0 align-baseline opacity-50"
              style={{ color: accentColor }}
            >
              {cursorChar}
            </motion.span>
          ) : null}
        </span>
      </div>

      {postText ? (
        <div
          className={cn(
            "max-w-full text-balance opacity-60",
            textAlignClass[textPosition],
            textClasses,
          )}
          style={{ fontFamily: headingFont }}
        >
          <span style={{ color: staticColor }}>{postText}</span>
        </div>
      ) : null}
    </SectionSurface>
  );
}
