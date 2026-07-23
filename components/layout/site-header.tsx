"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/lib/i18n/routing";
import { activeLocales, locales, type ActiveLocale } from "@/lib/i18n/locales";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type Props = {
  locale: string;
  user: { email: string; tier: string; role?: string } | null;
};

const menuItemClassName =
  "block w-full px-3 py-2.5 text-start text-sm text-text hover:bg-background-soft";

function emailInitials(email: string) {
  return email.trim().slice(0, 2).toUpperCase() || "?";
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

export function SiteHeader({ user }: Props) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as ActiveLocale;
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
            <Link href="/jobs" className="text hover:text-text">
              {t("nav.findWork")}
            </Link>
            <Link href="/workers" className="text hover:text-text">
              {t("nav.hire")}
            </Link>
            <Link href="/education" className="text hover:text-text">
              {t("nav.education")}
            </Link>
            <Link href="/help" className="text hover:text-text">
              {t("nav.help")}
            </Link>
            <Link href="/pricing" className="text hover:text-text">
              {t("nav.pricing")}
            </Link>
            {user ? (
              <>
                <Link
                  href="/worker/profile"
                  className="text hover:text-text"
                >
                  {t("nav.myProfile")}
                </Link>
                <Link
                  href="/employer/jobs"
                  className="text hover:text-text"
                >
                  {t("nav.myJobs")}
                </Link>
                <Link
                  href="/billing"
                  className="text hover:text-text"
                >
                  {t("nav.billing")}
                </Link>
                {user.role === "admin" ? (
                  <Link href="/admin" className="text hover:text-text">
                    {t("nav.admin")}
                  </Link>
                ) : null}
              </>
            ) : null}
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

              <div className="relative md:hidden" ref={menuRef}>
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
                  <div
                    id={menuId}
                    role="menu"
                    className="absolute end-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface text-text shadow-panel"
                  >
                    <p className="truncate px-3 py-2.5 text-xs text-muted">
                      {user.email}
                    </p>
                    <Link
                      href="/worker/profile"
                      role="menuitem"
                      className={menuItemClassName}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.workerProfile")}
                    </Link>
                    <Link
                      href="/employer/profile"
                      role="menuitem"
                      className={menuItemClassName}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.employerProfile")}
                    </Link>
                    <NotificationBell
                      className={`${menuItemClassName} flex items-center justify-between gap-2`}
                    >
                      {t("nav.notifications")}
                    </NotificationBell>
                    <Link
                      href="/help"
                      role="menuitem"
                      className={menuItemClassName}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.help")}
                    </Link>
                    <Link
                      href="/pricing"
                      role="menuitem"
                      className={menuItemClassName}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.pricing")}
                    </Link>
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
                        <div
                          id={localeMenuId}
                          role="menu"
                          className="bg-background-soft/50"
                        >
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
                                setMenuOpen(false);
                                router.replace(pathname, { locale: code });
                              }}
                            >
                              {locales[code].label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemClassName}
                      onClick={() => {
                        setMenuOpen(false);
                        void signOut({ callbackUrl: `/${locale}` });
                      }}
                    >
                      {t("nav.signOut")}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-black">
              <Link
                href="/sign-in"
                className="rounded-md px-3 py-1.5 hover:text-text"
              >
                {t("nav.signIn")}
              </Link>
              <Button asChild size="sm" variant="accent">
                <Link href="/sign-up">{t("nav.signUp")}</Link>
              </Button>
              <LanguageSelect />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
