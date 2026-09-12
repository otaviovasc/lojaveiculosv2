import {
  SiInstagram,
  SiMeta,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";
import type { ComponentProps, SVGProps } from "react";

export function InstagramLogo({
  className = "size-6",
  color = "currentColor",
  size = 24,
  title = "",
  ...props
}: ComponentProps<typeof SiInstagram>) {
  return (
    <SiInstagram
      className={className}
      color={color}
      size={size}
      title={title}
      {...props}
    />
  );
}

export function MetaLogo({
  className = "size-6",
  color = "currentColor",
  size = 24,
  title = "",
  ...props
}: ComponentProps<typeof SiMeta>) {
  return (
    <SiMeta
      className={className}
      color={color}
      size={size}
      title={title}
      {...props}
    />
  );
}

export function WhatsAppLogo({
  className = "size-6",
  color = "currentColor",
  size = 24,
  title = "",
  ...props
}: ComponentProps<typeof SiWhatsapp>) {
  return (
    <SiWhatsapp
      className={className}
      color={color}
      size={size}
      title={title}
      {...props}
    />
  );
}

/**
 * Official OLX vector trademark logo (Wikimedia Commons / OLX Group brand asset)
 */
export function OlxLogo({
  className = "size-6",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 81 36"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path d="M17.817 0C7.977 0 0 8.059 0 18s7.977 18 17.817 18 17.816-8.059 17.816-18S27.656 0 17.817 0zm0 30c-6.56 0-11.878-5.373-11.878-12S11.257 6 17.817 6v12h11.877c0 6.628-5.318 12-11.877 12z" />
      <path d="M10.723 18h7.094v7.167c-3.918 0-7.094-3.209-7.094-7.167zm36.447 7.393c-4.036 0-7.318-3.317-7.318-7.394s3.283-7.394 7.318-7.394 7.319 3.317 7.319 7.394-3.283 7.394-7.319 7.394zm0-10.678c-1.792 0-3.25 1.473-3.25 3.284 0 1.81 1.458 3.284 3.25 3.284s3.25-1.473 3.25-3.284c0-1.81-1.458-3.284-3.25-3.284zm8.542 6.33v-10.13c0-.045.036-.082.081-.082h4.056c.045 0 .081.037.081.083v9.907c0 .046.037.083.082.083h4.56c.044 0 .081.037.081.083v4.096a.082.082 0 01-.082.083h-4.779c-2.253 0-4.08-1.845-4.08-4.122zm20.058 4.122l-2.581-3.56-2.582 3.56h-5.203L70.586 18l-5.21-7.167h5.203l2.61 3.56 2.608-3.56H81L75.79 18l5.182 7.167H75.77z" />
    </svg>
  );
}
