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
  | "findWork"
  | "hire"
  | "education"
  | "marketplace"
  | "help"
  | "pricing"
  | "privacy"
  | "workerProfile"
  | "employerProfile"
  | "admin";

type NavGroupKey = "workers" | "hiring" | "browse" | "extra";

type NavItem = {
  href: string;
  labelKey: NavLabelKey;
  signedInOnly?: boolean;
};

type NavGroup = {
  key: NavGroupKey;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    key: "workers",
    items: [
      { href: "/jobs", labelKey: "findWork" },
      { href: "/worker/profile", labelKey: "workerProfile", signedInOnly: true },
      { href: "/education", labelKey: "education" },
    ],
  },
  {
    key: "hiring",
    items: [
      { href: "/workers", labelKey: "hire" },
      {
        href: "/employer/profile",
        labelKey: "employerProfile",
        signedInOnly: true,
      },
    ],
  },
  {
    key: "browse",
    items: [
      { href: "/marketplace", labelKey: "marketplace" },
      { href: "/privacy", labelKey: "privacy" },
    ],
  },
  {
    key: "extra",
    items: [
      { href: "/help", labelKey: "help" },
      { href: "/pricing", labelKey: "pricing" },
      { href: "/admin", labelKey: "admin", signedInOnly: true },
    ],
  },
];

const menuItemClassName =
  "block w-full px-3 py-2.5 text-start text-sm text-background duration-200 ease-out hover:bg-background hover:text-white motion-reduce:transition-none";

function emailInitials(email: string) {
  return email.trim().slice(0, 2).toUpperCase() || "?";
}

function filterNavItems(items: NavItem[], user: Props["user"]) {
  return items.filter((item) => {
    if (item.signedInOnly) return Boolean(user);
    return true;
  });
}

function navGroupsForUser(user: Props["user"]) {
  return navGroups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, user),
    }))
    .filter((group) => group.items.length > 0);
}

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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

function NavDropdown({
  group,
  open,
  onOpenChange,
}: {
  group: NavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const panelId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupActive = group.items.some((item) =>
    pathMatches(pathname, item.href),
  );

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => onOpenChange(false), 12);
  }

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        onOpenChange(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        clearCloseTimer();
        onOpenChange(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        className={`inline-flex items-center px-2.5 py-1.5 text-2xl font-bold transition-[color,background-color] duration-200 ease-out hover:bg-white hover:text-background motion-reduce:transition-none ${
          open || groupActive ? "text-white" : "text-white/80 hover:text-white"
        }`}
        onClick={() => onOpenChange(!open)}
      >
        <span className="text-2xl font-bold hover:text-background">{t(`nav.groups.${group.key}`)}</span>
        <span
          aria-hidden="true"
          className={`text-[0.65rem] text-white/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          
        </span>
      </button>

      <div
        className={`absolute start-0 top-full z-30 pt-2 transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1.5 scale-[0.98] opacity-0"
        }`}
      >
        <div
          id={panelId}
          role="menu"
          className="min-w-44 overflow-hidden rounded-md border border-white/15 bg-surface text-text shadow-panel"
        >
          <div
            aria-hidden="true"
            className={`h-0.5 origin-left bg-gradient-to-r from-foreground to-background transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              open ? "scale-x-100" : "scale-x-0"
            }`}
          />
          {group.items.map((item, index) => {
            const active = pathMatches(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`${menuItemClassName} ${
                  active ? "bg-background hover:bg-background text-white font-medium" : ""
                } ${open ? "translate-x-0 opacity-100" : "translate-x-1 opacity-0"}`}
                style={{
                  transitionDelay: open
                    ? `${60 + index * 40}ms`
                    : "0ms",
                }}
                onClick={() => onOpenChange(false)}
              >
                {t(`nav.${item.labelKey}`)}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DesktopNav({ user }: { user: Props["user"] }) {
  const [openGroup, setOpenGroup] = useState<NavGroupKey | null>(null);
  const groups = navGroupsForUser(user);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }

    if (!openGroup) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openGroup]);

  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {groups.map((group) => (
        <NavDropdown
          key={group.key}
          group={group}
          open={openGroup === group.key}
          onOpenChange={(open) => {
            if (open) {
              setOpenGroup(group.key);
              return;
            }
            // Only close if this group is still the open one. A delayed
            // leave from a previous group must not wipe a newly opened one.
            setOpenGroup((current) => (current === group.key ? null : current));
          }}
        />
      ))}
    </nav>
  );
}

function MobileMenuPanel({
  open,
  user,
  menuId,
  localeMenuId,
  localeOpen,
  setLocaleOpen,
  onClose,
}: {
  open: boolean;
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
  const [expandedGroup, setExpandedGroup] = useState<NavGroupKey | null>(null);
  const groups = navGroupsForUser(user);

  useEffect(() => {
    if (!open) setExpandedGroup(null);
  }, [open]);

  return (
    <div
      className={`absolute end-0 top-full z-30 mt-2 w-56 transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open
          ? "grid grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          id={menuId}
          role="menu"
          className="max-h-[min(32rem,calc(100dvh-5rem))] overflow-y-auto rounded-md border border-border bg-surface text-text shadow-panel"
        >
          {user ? (
            <p className="truncate px-3 py-2.5 text-xs text-muted">{user.email}</p>
          ) : null}
          {groups.map((group) => {
            const groupOpen = expandedGroup === group.key;
            const groupMenuId = `${menuId}-${group.key}`;
            return (
              <div key={group.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={groupOpen}
                  aria-controls={groupMenuId}
                  aria-haspopup="menu"
                  className={`${menuItemClassName} flex items-center justify-between font-medium`}
                  onClick={() =>
                    setExpandedGroup((current) =>
                      current === group.key ? null : group.key,
                    )
                  }
                >
                  <span>{t(`nav.groups.${group.key}`)}</span>
                  <span
                    aria-hidden="true"
                    className={`text-muted transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      groupOpen ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>
                </button>
                <div
                  id={groupMenuId}
                  role="menu"
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    groupOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                  aria-hidden={!groupOpen}
                >
                  <div className="min-h-0 overflow-hidden bg-background-soft/50">
                    {group.items.map((item, index) => {
                      const active = pathMatches(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          tabIndex={groupOpen ? 0 : -1}
                          className={`${menuItemClassName} pl-6 ${
                            active ? "font-medium" : ""
                          } ${
                            groupOpen
                              ? "translate-x-0 opacity-100"
                              : "translate-x-1 opacity-0"
                          }`}
                          style={{
                            transitionDelay: groupOpen
                              ? `${40 + index * 35}ms`
                              : "0ms",
                          }}
                          onClick={onClose}
                        >
                          {t(`nav.${item.labelKey}`)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div role="none">
            <button
              type="button"
              role="menuitem"
              aria-expanded={localeOpen}
              aria-controls={localeMenuId}
              aria-haspopup="menu"
              className={`${menuItemClassName} flex items-center justify-between`}
              onClick={() => setLocaleOpen((value) => !value)}
            >
              <span>{t("language")}</span>
              <span
                aria-hidden="true"
                className={`text-muted transition-transform duration-200 ease-out motion-reduce:transition-none ${
                  localeOpen ? "rotate-90" : ""
                }`}
              >
                ▸
              </span>
            </button>
            <div
              id={localeMenuId}
              role="menu"
              className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                localeOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
              aria-hidden={!localeOpen}
            >
              <div className="min-h-0 overflow-hidden bg-background-soft/50">
                {activeLocales.map((code) => (
                  <button
                    key={code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={locale === code}
                    tabIndex={localeOpen ? 0 : -1}
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
            </div>
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
      </div>
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
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
          </Link>
          <div className="mx-auto text-center text-lg text-muted">
            AGA - Always Growing Ahead
          </div>
          <DesktopNav user={user} />
        </div>

        <div className="flex items-center p-2 px-4 sm:px-6">
          {user ? (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <NotificationBell />
                <span className="text p-2">
                  {t("nav.welcome")} {user.email}
                </span>
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-controls={menuId}
                  aria-haspopup="menu"
                  aria-label={user.email}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-muted bg-gradient-to-l from-foreground to-background text-sm font-semibold tracking-wide text-muted"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {emailInitials(user.email)}
                </button>

                <MobileMenuPanel
                  open={menuOpen}
                  user={user}
                  menuId={menuId}
                  localeMenuId={localeMenuId}
                  localeOpen={localeOpen}
                  setLocaleOpen={setLocaleOpen}
                  onClose={() => setMenuOpen(false)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild size="sm" variant="default">
                  <Link href="/sign-in">{t("nav.signIn")}</Link>
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

                <MobileMenuPanel
                  open={menuOpen}
                  user={user}
                  menuId={menuId}
                  localeMenuId={localeMenuId}
                  localeOpen={localeOpen}
                  setLocaleOpen={setLocaleOpen}
                  onClose={() => setMenuOpen(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
