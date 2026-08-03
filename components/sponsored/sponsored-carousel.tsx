"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SponsoredItem } from "@/lib/sponsored/content";

type Props = {
  items: SponsoredItem[];
  intervalMs?: number;
};

export function SponsoredCarousel({ items, intervalMs = 5000 }: Props) {
  const t = useTranslations("sponsored");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(((index % items.length) + items.length) % items.length);
    },
    [items.length]
  );

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [items.length, intervalMs, isPaused]);

  if (items.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("ariaLabel")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="sponsored-carousel-frame max-w-5xl rounded-md p-0.5">
        <div className="relative h-20 overflow-hidden rounded-md bg-surface">
          {items.map((item, index) => {
            const isActive = index === activeIndex;

            return (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-700 ${
                  isActive ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={
                    item.imageUrl
                      ? { backgroundImage: `url(${item.imageUrl})` }
                      : undefined
                  }
                >
                  {!item.imageUrl ? (
                    <div className="h-full bg-gradient-to-br from-background via-foreground to-background-soft" />
                  ) : null}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                <span className="relative m-2 mb-auto w-fit rounded bg-foreground px-2 py-0.5 text-xs text-white">
                  {t("badge")}
                </span>

                <div className="relative p-2 text-white">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  {item.description ? (
                    <p className="text-xs">{item.description}</p>
                  ) : null}
                </div>
              </a>
            );
          })}

          {items.length > 1 ? (
            <div
              className="absolute bottom-2 end-2 flex gap-1"
              role="tablist"
              aria-label={t("slideIndicators")}
            >
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={t("goToSlide", { number: index + 1 })}
                  onClick={() => goTo(index)}
                  className={`h-1 rounded-full bg-white/50 ${
                    index === activeIndex ? "w-3 bg-white" : "w-1"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {t("slideStatus", {
          current: activeIndex + 1,
          total: items.length,
          title: items[activeIndex]?.title ?? "",
        })}
      </p>
    </section>
  );
}
