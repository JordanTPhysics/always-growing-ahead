"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/forms";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

const headerCircleClassName =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-white transition-colors hover:bg-white/15";

function goToSearch(router: ReturnType<typeof useRouter>, value: string) {
  const query = value.trim();
  if (!query) return false;
  router.push(`/search?q=${encodeURIComponent(query)}`);
  return true;
}

export function SiteSearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  return (
    <form
      role="search"
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        goToSearch(router, value);
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {t("label")}
      </label>
      <input
        id={inputId}
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("placeholder")}
        className={inputClassName}
        autoComplete="off"
      />
      <Button type="submit" className="w-full sm:w-auto">
        {t("submit")}
      </Button>
    </form>
  );
}

export function HeaderSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const panelId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={headerCircleClassName}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("label")}
        onClick={() => setOpen((current) => !current)}
      >
        <FiSearch className="size-5" aria-hidden />
      </button>
      <div
        className={cn(
          "absolute end-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open
            ? "grid grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid grid-rows-[0fr] opacity-0"
        )}
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            id={panelId}
            role="search"
            className="flex gap-2 rounded-md border border-border bg-surface p-2 text-text shadow-panel"
            onSubmit={(event) => {
              event.preventDefault();
              if (goToSearch(router, value)) setOpen(false);
            }}
          >
            <label className="sr-only" htmlFor={inputId}>
              {t("label")}
            </label>
            <input
              id={inputId}
              name="q"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={t("placeholder")}
              ref={inputRef}
              className={cn(inputClassName, "h-10")}
              autoComplete="off"
            />
            <Button type="submit" size="sm">
              {t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
