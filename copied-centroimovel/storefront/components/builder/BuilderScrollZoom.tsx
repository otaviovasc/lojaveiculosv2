"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";

interface ScrollZoomImage {
  src: string;
  alt?: string;
}

interface BuilderScrollZoomProps {
  images?: ScrollZoomImage[];
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  titlePosition?: "center" | "bottom";
  containerHeight?: "200vh" | "250vh" | "300vh" | "350vh";
  style?: ComponentStyleProps;
  config: StoreConfig;
}

export function BuilderScrollZoom({
  images = [],
  title = "FOQUE NAS VENDAS",
  subtitle,
  showTitle = true,
  titlePosition = "center",
  containerHeight = "300vh",
  style,
  config,
}: BuilderScrollZoomProps) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 30,
    restDelta: 0.001,
  });

  const scaleMain = useTransform(smoothProgress, [0, 0.8], [1, 4]);
  const scale5 = useTransform(smoothProgress, [0, 0.7], [1, 5]);
  const scale6 = useTransform(smoothProgress, [0, 0.7], [1, 6]);
  const scale8 = useTransform(smoothProgress, [0, 0.7], [1, 8]);
  const scale9 = useTransform(smoothProgress, [0, 0.7], [1, 9]);

  const scales = [scaleMain, scale5, scale6, scale5, scale6, scale8, scale9];

  const satelliteOpacity = useTransform(smoothProgress, [0.4, 0.75], [1, 0]);

  const mainBorderRadius = useTransform(
    smoothProgress,
    [0.75, 0.8],
    ["24px", "0px"],
  );
  const mainShadow = useTransform(
    smoothProgress,
    [0.75, 0.8],
    ["0px 40px 100px rgba(0,0,0,0.4)", "0px 0px 0px rgba(0,0,0,0)"],
  );
  const mainOverlayOpacity = useTransform(
    smoothProgress,
    [0.75, 0.9],
    [0, 0.6],
  );

  const [showText, setShowText] = useState(false);
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (latest > 0.73 && !showText) {
      setShowText(true);
    } else if (latest <= 0.73 && showText) {
      setShowText(false);
    }
  });

  const xDrift = useTransform(smoothProgress, [0, 0.75], [0, 200]);
  const yDrift = useTransform(smoothProgress, [0, 0.75], [0, -200]);

  const heightMap = {
    "200vh": "200vh",
    "250vh": "250vh",
    "300vh": "300vh",
    "350vh": "350vh",
  };

  const positionClasses = {
    center: "items-center justify-center",
    bottom: "items-end justify-center pb-32",
  };

  const resolvedTextColor = style?.textColor || "#FFFFFF";
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  return (
    <div
      ref={container}
      className="relative w-full"
      style={{ height: heightMap[containerHeight] }}
    >
      <SectionSurface
        as="div"
        style={style}
        className={cn("sticky top-0 h-screen w-full overflow-hidden")}
        innerClassName={cn(
          "flex h-full min-h-0 w-full",
          positionClasses[titlePosition],
        )}
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="h-40 w-40 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 animate-pulse shadow-2xl" />
            <p
              className="text-sm font-bold uppercase tracking-[0.2em] opacity-40"
              style={{ color: resolvedTextColor }}
            >
              Adicione imagens na edição
            </p>
          </div>
        ) : (
          images.map(({ src, alt }, index) => {
            const scale = scales[index % scales.length];
            const isMain = index === 0;

            return (
              <motion.div
                key={index}
                style={{
                  scale,
                  opacity: isMain ? 1 : satelliteOpacity,
                  zIndex: isMain ? 10 : 1,
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  style={{
                    borderRadius: isMain ? mainBorderRadius : "12px",
                    boxShadow: isMain ? mainShadow : "none",
                    x: !isMain ? (index % 2 === 0 ? xDrift : -xDrift) : 0,
                    y: !isMain ? (index % 3 === 0 ? yDrift : -yDrift) : 0,
                  }}
                  className={cn(
                    "relative overflow-hidden pointer-events-auto transition-shadow duration-700",
                    index === 1 && "-translate-y-[120%] translate-x-[20%]",
                    index === 2 && "-translate-y-[40%] -translate-x-[110%]",
                    index === 3 && "translate-x-[120%] translate-y-[10%]",
                    index === 4 && "translate-y-[110%] translate-x-[20%]",
                    index === 5 && "translate-y-[110%] -translate-x-full",
                    index === 6 && "translate-y-[80%] translate-x-[110%]",
                    !isMain && "h-[30vh] w-[30vw]",
                    isMain && "h-full w-full",
                  )}
                >
                  <img
                    src={src || "/placeholder.svg"}
                    alt={alt || `Parallax image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {isMain && showTitle && (
                    <>
                      <motion.div
                        style={{ opacity: mainOverlayOpacity }}
                        className="absolute inset-0 bg-black pointer-events-none z-10"
                      />
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center">
                        {showText && (
                          <div className="space-y-6 max-w-4xl">
                            <motion.h2
                              initial={{
                                y: 40,
                                opacity: 0,
                                filter: "blur(10px)",
                              }}
                              animate={{
                                y: 0,
                                opacity: 1,
                                filter: "blur(0px)",
                              }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="text-white text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] drop-shadow-2xl"
                              style={{ fontFamily: headingFont }}
                            >
                              {title}
                            </motion.h2>
                            {subtitle && (
                              <motion.p
                                initial={{
                                  y: 20,
                                  opacity: 0,
                                  filter: "blur(5px)",
                                }}
                                animate={{
                                  y: 0,
                                  opacity: 1,
                                  filter: "blur(0px)",
                                }}
                                transition={{
                                  duration: 0.8,
                                  delay: 0.3,
                                  ease: "easeOut",
                                }}
                                className="text-white/80 text-lg md:text-2xl font-light tracking-wide max-w-2xl mx-auto drop-shadow-xl"
                                style={{ fontFamily: bodyFont }}
                              >
                                {subtitle}
                              </motion.p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            );
          })
        )}
      </SectionSurface>
    </div>
  );
}
