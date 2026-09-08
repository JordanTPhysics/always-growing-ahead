"use client";

import { useEffect } from "react";
import { usePathname } from "@/lib/i18n/navigation";

const HOME_SECTION_IDS = new Set(["help", "privacy"]);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToSectionId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    function scrollToHash() {
      const id = window.location.hash.replace(/^#/, "");
      if (!HOME_SECTION_IDS.has(id)) return;
      scrollToSectionId(id);
    }

    const frame = requestAnimationFrame(scrollToHash);
    const timeout = window.setTimeout(scrollToHash, 120);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, [pathname]);

  return null;
}
