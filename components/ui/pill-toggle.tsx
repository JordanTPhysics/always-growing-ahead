"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillToggleOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type PillToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: PillToggleOption<T>[];
  ariaLabel: string;
  className?: string;
  fullWidth?: boolean;
};

export function PillToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  fullWidth = false,
}: PillToggleProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const isLastActive = activeIndex === options.length - 1;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-active-last={isLastActive ? "" : undefined}
      className={cn("pill-toggle", fullWidth && "pill-toggle-full", className)}
      style={
        {
          "--option-count": options.length,
          "--active-index": activeIndex,
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="pill-toggle-thumb" />
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className="pill-toggle-option"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
