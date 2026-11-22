"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MdArrowBack } from "react-icons/md";
import { EducationCommentsPanel } from "@/components/education/education-comments-panel";
import { EducationShortCard } from "@/components/education/education-short-card";
import type { EducationLibraryItem } from "@/components/education/education-type-library";
import { Link } from "@/lib/i18n/navigation";

type Props = {
  resources: EducationLibraryItem[];
};

export function EducationShortsFeed({ resources }: Props) {
  const t = useTranslations("education");
  const locale = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [commentsResource, setCommentsResource] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const wheelLockUntil = useRef(0);

  useEffect(() => {
    if (resources.length === 0) return;
    let cancelled = false;

    async function loadCounts() {
      try {
        const ids = resources.map((resource) => resource.id).join(",");
        const response = await fetch(
          `/api/education/comments/counts?ids=${encodeURIComponent(ids)}`
        );
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          counts?: Record<string, number>;
        };
        if (!data.counts || cancelled) return;
        const next: Record<number, number> = {};
        for (const [key, value] of Object.entries(data.counts)) {
          next[Number(key)] = Number(value);
        }
        setCommentCounts(next);
      } catch {
        // Counts are optional UI polish.
      }
    }

    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [resources]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = itemRefs.current.findIndex((el) => el === entry.target);
          if (index >= 0) {
            setActiveIndex(index);
            if (index > 0) setHasSwiped(true);
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    itemRefs.current.length = resources.length;
    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [resources]);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id.startsWith("resource-")) return;
    const resourceId = Number(id.slice("resource-".length));
    const index = resources.findIndex((resource) => resource.id === resourceId);
    if (index < 0) return;
    itemRefs.current[index]?.scrollIntoView({ block: "start" });
  }, [resources]);

  useEffect(() => {
    if (!shareMessage) return;
    const timer = window.setTimeout(() => setShareMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  const scrollToIndex = useCallback((index: number) => {
    const next = Math.min(Math.max(index, 0), resources.length - 1);
    activeIndexRef.current = next;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    itemRefs.current[next]?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [resources.length]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onWheel(event: WheelEvent) {
      if (commentsResource) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
      const now = Date.now();
      if (now < wheelLockUntil.current) return;
      wheelLockUntil.current = now + 700;
      scrollToIndex(activeIndexRef.current + (event.deltaY > 0 ? 1 : -1));
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [commentsResource, scrollToIndex]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (commentsResource) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, commentsResource, scrollToIndex]);

  const shareResource = useCallback(
    async (resource: EducationLibraryItem) => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/${locale}/education/short-videos#resource-${resource.id}`
          : `/${locale}/education/short-videos#resource-${resource.id}`;

      const shareData = {
        title: resource.title,
        text: resource.title,
        url,
      };

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        setShareMessage(t("linkCopied"));
      } catch {
        setShareMessage(t("shareFailed"));
      }
    },
    [locale, t]
  );

  return (
    <div className="relative h-full w-full">
      <Link
        href="/education"
        aria-label={t("backToHub")}
        className="absolute start-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
      >
        <MdArrowBack className="h-6 w-6 rtl:rotate-180" aria-hidden />
      </Link>

      <div
        ref={containerRef}
        className="education-shorts-feed h-full w-full overflow-y-auto overscroll-y-contain scroll-smooth"
        aria-label={t("feedLabel")}
      >
        {resources.map((resource, index) => (
          <div
            key={resource.id}
            id={`resource-${resource.id}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="h-full w-full shrink-0"
          >
            <EducationShortCard
              key={`${resource.id}-${activeIndex === index ? "active" : "idle"}`}
              resource={resource}
              commentCount={commentCounts[resource.id] ?? 0}
              onOpenComments={() =>
                setCommentsResource({ id: resource.id, title: resource.title })
              }
              onShare={() => void shareResource(resource)}
              isActive={activeIndex === index}
              suspended={commentsResource?.id === resource.id}
              showSwipeHint={
                index === 0 && resources.length > 1 && !hasSwiped && activeIndex === 0
              }
            />
          </div>
        ))}
      </div>

      {shareMessage ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto w-fit rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm"
        >
          {shareMessage}
        </div>
      ) : null}

      {commentsResource ? (
        <EducationCommentsPanel
          resourceId={commentsResource.id}
          resourceTitle={commentsResource.title}
          open
          onClose={() => setCommentsResource(null)}
          onCountChange={(count) =>
            setCommentCounts((prev) => ({
              ...prev,
              [commentsResource.id]: count,
            }))
          }
        />
      ) : null}
    </div>
  );
}
