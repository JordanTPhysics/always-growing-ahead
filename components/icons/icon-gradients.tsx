import type { CSSProperties } from "react";

export const iconFill = {
  facebook: { fill: "url(#icon-gradient-facebook)" },
  instagram: { fill: "url(#icon-gradient-instagram)" },
  linkedin: { fill: "url(#icon-gradient-linkedin)" },
  tiktok: { fill: "url(#icon-gradient-tiktok)" },
  email: { fill: "url(#icon-gradient-email)" },
  phone: { fill: "url(#icon-gradient-phone)" },
  whatsapp: { fill: "url(#icon-gradient-whatsapp)" },
} as const satisfies Record<string, CSSProperties>;

export function IconGradients() {
  return (
    <svg
      aria-hidden
      focusable="false"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <defs>
        <linearGradient id="icon-gradient-facebook" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#4d8dff" />
          <stop offset="100%" stopColor="#0866ff" />
        </linearGradient>
        <linearGradient id="icon-gradient-instagram" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f9ce34" />
          <stop offset="50%" stopColor="#ee2a7b" />
          <stop offset="100%" stopColor="#6228d7" />
        </linearGradient>
        <linearGradient id="icon-gradient-linkedin" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#4da3e8" />
          <stop offset="100%" stopColor="#0a66c2" />
        </linearGradient>
        <linearGradient id="icon-gradient-tiktok" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#25f4ee" />
          <stop offset="100%" stopColor="#fe2c55" />
        </linearGradient>
        <linearGradient id="icon-gradient-email" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="icon-gradient-phone" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="icon-gradient-whatsapp" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#5bf088" />
          <stop offset="100%" stopColor="#128c7e" />
        </linearGradient>
      </defs>
    </svg>
  );
}
