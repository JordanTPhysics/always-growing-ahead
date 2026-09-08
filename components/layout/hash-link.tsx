"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { scrollToSectionId } from "@/components/layout/hash-scroll";

type Props = ComponentProps<typeof Link>;

function parseHref(href: Props["href"]) {
  if (typeof href !== "string") {
    return { path: "/", hash: "" };
  }
  const [path, hash = ""] = href.split("#");
  return { path: path || "/", hash };
}

export function HashLink({ href, onClick, ...props }: Props) {
  const pathname = usePathname();
  const { path, hash } = parseHref(href);

  return (
    <Link
      href={href}
      scroll={!hash}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !hash) return;
        if (pathname !== path) return;
        event.preventDefault();
        if (window.location.hash === `#${hash}`) {
          scrollToSectionId(hash);
          return;
        }
        window.location.hash = hash;
      }}
      {...props}
    />
  );
}
