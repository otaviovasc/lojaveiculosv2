"use client";

/**
 * Provides the SVG filter required for the liquid glass effect.
 * Place this once in your layout or at the root of a template.
 */
export function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter
          id="liquid-glass-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.015"
            numOctaves="2"
            seed="2"
            result="turbulence"
          />
          <feGaussianBlur
            in="turbulence"
            stdDeviation="4"
            result="blurredNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="35"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur
            in="displaced"
            stdDeviation="1.5"
            result="finalBlur"
          />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
