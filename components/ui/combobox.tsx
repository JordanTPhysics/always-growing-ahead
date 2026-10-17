"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { inputClassName } from "@/components/ui/forms";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  icon?: ReactNode;
};

type OptionInput = string | ComboboxOption;

type Props = {
  label: ReactNode;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly OptionInput[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  maxLength?: number;
};

function asOption(option: OptionInput): ComboboxOption {
  return typeof option === "string" ? { value: option } : option;
}

function listedValue(value: string, options: readonly ComboboxOption[]): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return (
    options.find((option) => option.value.toLowerCase() === trimmed.toLowerCase())
      ?.value ?? trimmed
  );
}

export function Combobox({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
  required,
  error,
  maxLength,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef(query);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  queryRef.current = query;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const choices = useMemo(() => options.map(asOption), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return choices;
    return choices.filter((option) => option.value.toLowerCase().includes(q));
  }, [choices, query]);

  function commit(raw: string) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    const next = listedValue(raw, choices);
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  function syncOnBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      commit(queryRef.current);
    }, 0);
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <label
        className={cn(
          "block text-sm font-medium",
          error ? "text-danger" : "text-text"
        )}
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        className={cn(inputClassName, error && "border-danger focus:ring-danger")}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={syncOnBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {open && !disabled && filtered.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface shadow-panel">
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-background-soft",
                  option.value === value && "bg-background-soft font-medium"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(option.value);
                }}
              >
                {option.icon}
                <span>{option.value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
