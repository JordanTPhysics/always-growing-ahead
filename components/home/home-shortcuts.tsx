"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";

const shortcuts = [
  { href: "/jobs", label: "findWork", variant: "default" },
  { href: "/workers", label: "hire", variant: "secondary" },
  { href: "/education", label: "education", variant: "accent" },
  { href: "/marketplace", label: "marketplace", variant: "indigo" },
] as const;

export function HomeShortcuts() {
  const t = useTranslations("common");

  return (
    <nav
      aria-label={t("shortcuts.label")}
      className="grid h-auto w-full grid-cols-2 content-start gap-2 sm:grid-cols-4"
    >
      {shortcuts.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={item.variant}
          size="sm"
          className="h-auto w-full min-w-0 whitespace-normal px-2 py-1.5 text-center text-xs leading-snug sm:text-sm"
        >
          <Link href={item.href}>
            <span className="min-w-0 text-balance">{t(`shortcuts.${item.label}`)}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
}
