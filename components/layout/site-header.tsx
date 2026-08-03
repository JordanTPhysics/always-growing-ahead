"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/lib/i18n/routing";
import { activeLocales, locales, type ActiveLocale } from "@/lib/i18n/locales";
import { signOut, useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type Props = {
  locale: string;
  user: { email: string; tier: string; role?: string } | null;
};

type NavLabelKey =
  | "home"
  | "findWork"
  | "hire"
  | "education"
  | "marketplace"
  | "help"
  | "pricing"
  | "privacy"
  | "workerProfile"
  | "employerProfile"
  | "myJobs"
  | "billing"
  | "notifications"
  | "admin";

type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  signedInOnly?: boolean;
};

const publicNavItems: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/jobs", labelKey: "findWork" },
  { href: "/workers", labelKey: "hire" },
  { href: "/education", labelKey: "education" },
  { href: "/marketplace", labelKey: "marketplace" },
  { href: "/help", labelKey: "help" },
  { href: "/pricing", labelKey: "pricing" },
  { href: "/privacy", labelKey: "privacy" },
];

const accountNavItems: NavItem[] = [
  { href: "/worker/profile", labelKey: "workerProfile", signedInOnly: true },
  { href: "/employer/profile", labelKey: "employerProfile", signedInOnly: true },
  { href: "/employer/jobs", labelKey: "myJobs", signedInOnly: true },
  { href: "/billing", labelKey: "billing", signedInOnly: true },
  { href: "/admin", labelKey: "admin", signedInOnly: true },
  { href: "/notifications", labelKey: "notifications", signedInOnly: true },
];

const menuItemClassName =
  "block w-full px-3 py-2.5 text-start text-sm text-background hover:bg-background-soft";

function emailInitials(email: string) {
  return email.trim().slice(0, 2).toUpperCase() || "?";
}

function navItemsForUser(user: Props["user"]) {
  return [...publicNavItems, ...accountNavItems].filter((item) => {
    if (item.signedInOnly) return Boolean(user);
    return true;
  });
}

function LanguageSelect() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as ActiveLocale;

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t("language")}</span>
      <select
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-text"
        value={locale}
        onChange={(e) => {
          router.replace(pathname, {
            locale: e.target.value as ActiveLocale,
          });
        }}
      >
        {activeLocales.map((code) => (
          <option key={code} value={code}>
            {locales[code].label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileMenuPanel({
  user,
  menuId,
  localeMenuId,
  localeOpen,
  setLocaleOpen,
  onClose,
}: {
  user: Props["user"];
  menuId: string;
  localeMenuId: string;
  localeOpen: boolean;
  setLocaleOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  onClose: () => void;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as ActiveLocale;

  return (
    <div
      id={menuId}
      role="menu"
      className="absolute end-0 top-full z-30 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-56 overflow-y-auto rounded-md border border-border bg-surface text-text shadow-panel"
    >
      {user ? (
        <p className="truncate px-3 py-2.5 text-xs text-muted">{user.email}</p>
      ) : null}
      {navItemsForUser(user).map((item) =>
        item.labelKey === "notifications" ? (
          <NotificationBell
            key={item.href}
            className={`${menuItemClassName} flex items-center justify-between gap-2`}
          >
            {t(`nav.${item.labelKey}`)}
          </NotificationBell>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            className={menuItemClassName}
            onClick={onClose}
          >
            {t(`nav.${item.labelKey}`)}
          </Link>
        )
      )}
      <div role="none">
        <button
          type="button"
          role="menuitem"
          aria-expanded={localeOpen}
          aria-controls={localeMenuId}
          aria-haspopup="menu"
          className={`${menuItemClassName} flex items-center justify-between`}
          onClick={() => setLocaleOpen((open) => !open)}
        >
          <span>{t("language")}</span>
          <span aria-hidden="true" className="text-muted">
            {localeOpen ? "▾" : "▸"}
          </span>
        </button>
        {localeOpen ? (
          <div id={localeMenuId} role="menu" className="bg-background-soft/50">
            {activeLocales.map((code) => (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={locale === code}
                className={`${menuItemClassName} pl-6 ${
                  locale === code ? "font-medium" : ""
                }`}
                onClick={() => {
                  onClose();
                  router.replace(pathname, { locale: code });
                }}
              >
                {locales[code].label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {user ? (
        <button
          type="button"
          role="menuitem"
          className={menuItemClassName}
          onClick={() => {
            onClose();
            void signOut({ callbackUrl: `/${locale}` });
          }}
        >
          {t("nav.signOut")}
        </button>
      ) : (
        <>
          <Link
            href="/sign-in"
            role="menuitem"
            className={menuItemClassName}
            onClick={onClose}
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href="/sign-up"
            role="menuitem"
            className={menuItemClassName}
            onClick={onClose}
          >
            {t("nav.signUp")}
          </Link>
        </>
      )}
    </div>
  );
}

export function SiteHeader({ user: initialUser }: Props) {
  const t = useTranslations("common");
  const locale = useLocale() as ActiveLocale;
  const { data: session } = useSession();
  const user = session?.user
    ? {
        email: session.user.email,
        tier: session.user.tier,
        role: session.user.role,
      }
    : initialUser;
  const [menuOpen, setMenuOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const localeMenuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      setLocaleOpen(false);
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (localeOpen) setLocaleOpen(false);
        else setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, localeOpen]);

  return (
    <header className="relative z-20 bg-radial-gradient-to-l from-background to-foreground text-white">
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
          </Link>
          <div className="text-lg mx-auto flex flex-row text-muted text-center">AGA - Always Growing Ahead</div>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            {navItemsForUser(user).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text hover:text-text"
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center p-2 px-4 sm:px-6">
          {user ? (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <span className="text">
                  {t("nav.welcome")} {user.email}
                </span>
                <NotificationBell />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => signOut({ callbackUrl: `/${locale}` })}
                >
                  {t("nav.signOut")}
                </Button>
                <LanguageSelect />
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                  aria-label={user.email}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-l from-foreground to-background text-sm font-semibold tracking-wide text-muted border-muted border-2"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {emailInitials(user.email)}
                </button>

                {menuOpen ? (
                  <MobileMenuPanel
                    user={user}
                    menuId={menuId}
                    localeMenuId={localeMenuId}
                    localeOpen={localeOpen}
                    setLocaleOpen={setLocaleOpen}
                    onClose={() => setMenuOpen(false)}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild size="sm" variant="default">
                <Link
                  href="/sign-in"
                >
                  {t("nav.signIn")}
                </Link>
                </Button>

                <Button asChild size="sm" variant="accent">
                  <Link href="/sign-up">{t("nav.signUp")}</Link>
                </Button>
                <LanguageSelect />
              </div>

              <div className="relative sm:hidden" ref={menuRef}>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                  aria-label={t("nav.menu")}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {t("nav.menu")}
                </button>

                {menuOpen ? (
                  <MobileMenuPanel
                    user={user}
                    menuId={menuId}
                    localeMenuId={localeMenuId}
                    localeOpen={localeOpen}
                    setLocaleOpen={setLocaleOpen}
                    onClose={() => setMenuOpen(false)}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
