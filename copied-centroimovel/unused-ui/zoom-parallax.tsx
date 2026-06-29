"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef, useState } from "react";
import { WordPullUp } from "./word-pull-up";

interface Image {
  src: string;
  alt?: string;
}

interface ZoomParallaxProps {
  /** Array of images to be displayed in the parallax effect max 7 images */
  images: Image[];
}

export function ZoomParallax({ images }: ZoomParallaxProps) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 30,
    restDelta: 0.001,
  });

  // Reach full viewport scale near the end (0.80) to avoid "dead" scroll time
  const scaleMain = useTransform(smoothProgress, [0, 0.8], [1, 4]);

  // Satellite scales
  const scale5 = useTransform(smoothProgress, [0, 0.7], [1, 5]);
  const scale6 = useTransform(smoothProgress, [0, 0.7], [1, 6]);
  const scale8 = useTransform(smoothProgress, [0, 0.7], [1, 8]);
  const scale9 = useTransform(smoothProgress, [0, 0.7], [1, 9]);

  const scales = [scaleMain, scale5, scale6, scale5, scale6, scale8, scale9];

  // Fade out satellite images as we focus on the main one
  const satelliteOpacity = useTransform(smoothProgress, [0.4, 0.75], [1, 0]);

  // Animate radius and shadow away as we approach the final view
  const mainBorderRadius = useTransform(
    smoothProgress,
    [0.75, 0.8],
    ["12px", "0px"],
  );
  const mainShadow = useTransform(
    smoothProgress,
    [0.75, 0.8],
    ["0px 20px 50px rgba(0,0,0,0.3)", "0px 0px 0px rgba(0,0,0,0)"],
  );
  const mainOverlayOpacity = useTransform(
    smoothProgress,
    [0.75, 0.9],
    [0, 0.4],
  );

  const [showText, setShowText] = useState(false);
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (latest > 0.73 && !showText) {
      setShowText(true);
    } else if (latest <= 0.73 && showText) {
      setShowText(false);
    }
  });

  // Extra "drift" for satellite images to create depth
  const xDrift = useTransform(smoothProgress, [0, 0.75], [0, 150]);
  const yDrift = useTransform(smoothProgress, [0, 0.75], [0, -150]);

  return (
    <div ref={container} className="relative h-[300vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {images.map(({ src, alt }, index) => {
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
                  borderRadius: isMain ? mainBorderRadius : "8px",
                  boxShadow: isMain ? mainShadow : "none",
                  x: !isMain ? (index % 2 === 0 ? xDrift : -xDrift) : 0,
                  y: !isMain ? (index % 3 === 0 ? yDrift : -yDrift) : 0,
                }}
                className={cn(
                  "relative h-[25vh] w-[25vw] overflow-hidden pointer-events-auto transition-shadow duration-500",
                  index === 1 && "-translate-y-[120%] translate-x-[20%]",
                  index === 2 && "-translate-y-[40%] -translate-x-[110%]",
                  index === 3 && "translate-x-[120%] translate-y-[10%]",
                  index === 4 && "translate-y-[110%] translate-x-[20%]",
                  index === 5 && "translate-y-[110%] -translate-x-full",
                  index === 6 && "translate-y-[80%] translate-x-[110%]",
                )}
              >
                <img
                  src={src || "/placeholder.svg"}
                  alt={alt || `Parallax image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {isMain && (
                  <>
                    <motion.div
                      style={{ opacity: mainOverlayOpacity }}
                      className="absolute inset-0 bg-stone-900 pointer-events-none z-10"
                    />
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-4">
                      {showText && (
                        <WordPullUp
                          words="FOQUE NAS VENDAS"
                          className="text-white text-xl sm:text-2xl md:text-3xl font-black drop-shadow-2xl uppercase tracking-tighter leading-tight! text-center max-w-[80%]"
                        />
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
