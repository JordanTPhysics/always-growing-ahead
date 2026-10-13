"use client";

import { useLayoutEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FiMoon, FiSun } from "react-icons/fi";
import { THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const t = useTranslations("common");
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    setTheme(saved);
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 text-white transition-colors hover:bg-white/15"
    >
      <FiMoon className="theme-toggle-moon size-5" aria-hidden />
      <FiSun className="theme-toggle-sun size-5" aria-hidden />
    </button>
  );
}
