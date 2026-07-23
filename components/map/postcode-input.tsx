"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/forms";

type Suggestion = { id: string; label: string };

type Result = {
  lat: number;
  lng: number;
  postcode: string;
  address_text: string;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onResolved: (result: Result) => void;
  disabled?: boolean;
};

export function PostcodeInput({
  label,
  placeholder,
  value,
  onChange,
  onResolved,
  disabled,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      requestId.current += 1;
      debounceRef.current = setTimeout(() => {
        setSuggestions([]);
        setOpen(false);
      }, 0);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }

    const id = ++requestId.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/postcodes?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== requestId.current) return;
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch {
        if (id !== requestId.current) return;
        setSuggestions([]);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  async function pick(suggestion: Suggestion) {
    setLoading(true);
    setOpen(false);
    onChange(suggestion.label);
    try {
      const res = await fetch(
        `/api/postcodes?resolve=1&id=${encodeURIComponent(suggestion.id)}&label=${encodeURIComponent(suggestion.label)}`
      );
      const data = await res.json();
      if (data.result) onResolved(data.result);
    } finally {
      setLoading(false);
    }
  }

  async function resolveTyped() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/postcodes?resolve=1&q=${encodeURIComponent(value.trim())}`
      );
      const data = await res.json();
      if (data.result) {
        onChange(data.result.postcode || data.result.address_text);
        onResolved(data.result);
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          className={inputClassName}
          value={value}
          disabled={disabled || loading}
          placeholder={placeholder}
          autoComplete="postal-code"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[0]) void pick(suggestions[0]);
              else void resolveTyped();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="default"
          disabled={disabled || loading || !value.trim()}
          onClick={() => void resolveTyped()}
          className="shrink-0 px-3"
        >
          {loading ? "…" : "↵"}
        </Button>
      </div>
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-surface shadow-panel">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-start text-sm hover:bg-background-soft"
                onClick={() => void pick(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
