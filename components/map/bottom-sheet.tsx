"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  desktopSidePanel?: boolean;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  desktopSidePanel = true,
}: Props) {
  const titleId = useId();
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startY.current == null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }, []);

  const onPointerUp = useCallback(() => {
    setDragY((current) => {
      if (current > 120) onClose();
      return 0;
    });
    startY.current = null;
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-30 bg-foreground/30 lg:bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={
          desktopSidePanel
            ? "fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-2xl border border-border bg-surface shadow-panel lg:inset-y-0 lg:start-0 lg:end-auto lg:max-h-none lg:w-1/2 lg:rounded-none lg:border-y-0 lg:border-e lg:border-s-0 lg:shadow-none"
            : "fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-2xl border border-border bg-surface shadow-panel lg:inset-x-1/4"
        }
        style={
          dragY
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center px-4 pb-2 pt-3 active:cursor-grabbing lg:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          {title ? (
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </>
  );
}
