"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
  /** Keep each label on one line and scroll sideways when the row is wider than the screen. */
  scrollable?: boolean;
};

export function PillToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  fullWidth = false,
  scrollable = false,
}: PillToggleProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const isLastActive = activeIndex === options.length - 1;
  const labelKey = options.map((option) => String(option.label)).join("\n");

  useLayoutEffect(() => {
    if (!scrollable) return;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    const place = () => {
      const active = track.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!active) return;
      thumb.style.left = "0px";
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.transform = `translateX(${active.offsetLeft}px)`;
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(track);
    return () => observer.disconnect();
  }, [scrollable, value, labelKey]);

  useLayoutEffect(() => {
    if (!scrollable) return;
    const track = trackRef.current;
    const scroller = track?.parentElement;
    const active = track?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!track || !scroller || !active) return;
    const left =
      active.offsetLeft - (scroller.clientWidth - active.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left) });
  }, [scrollable, value, labelKey]);

  const track = (
    <div
      ref={trackRef}
      role="group"
      aria-label={ariaLabel}
      data-active-last={isLastActive ? "" : undefined}
      className={cn(
        "pill-toggle",
        fullWidth && "pill-toggle-full",
        scrollable && "pill-toggle-scroll",
        !scrollable && className
      )}
      style={
        {
          "--option-count": options.length,
          "--active-index": activeIndex,
        } as CSSProperties
      }
    >
      <span ref={thumbRef} aria-hidden="true" className="pill-toggle-thumb" />
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

  if (!scrollable) return track;

  return <div className={cn("pill-toggle-scroll-wrap", className)}>{track}</div>;
}
