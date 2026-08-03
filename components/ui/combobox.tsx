"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClassName } from "@/components/ui/forms";

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
  required?: boolean;
};

export function Combobox({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
  required,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef(query);
  const valueRef = useRef(value);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  queryRef.current = query;
  valueRef.current = value;

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  function pick(option: string) {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    onChange(option);
    setQuery(option);
    setOpen(false);
  }

  function syncOnBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      const trimmed = queryRef.current.trim();
      if (!trimmed) {
        onChange("");
        setQuery("");
        return;
      }
      const exact = options.find(
        (option) => option.toLowerCase() === trimmed.toLowerCase()
      );
      if (exact) {
        pick(exact);
        return;
      }
      setQuery(valueRef.current);
    }, 0);
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <label className="block text-sm font-medium text-text">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        className={inputClassName}
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={syncOnBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && filtered[0]) {
            e.preventDefault();
            pick(filtered[0]);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && !disabled && filtered.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface shadow-panel">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={`w-full px-3 py-2.5 text-start text-sm hover:bg-background-soft ${
                  option === value ? "bg-background-soft font-medium" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(option);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
