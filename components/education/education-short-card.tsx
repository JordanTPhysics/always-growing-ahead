"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MdChatBubbleOutline,
  MdKeyboardArrowUp,
  MdPlayArrow,
  MdShare,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import type { EducationLibraryItem } from "@/components/education/education-type-library";
import { cn } from "@/lib/utils";

type Props = {
  resource: EducationLibraryItem;
  commentCount: number;
  onOpenComments: () => void;
  onShare: () => void;
  isActive: boolean;
  suspended?: boolean;
  showSwipeHint: boolean;
};

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export function EducationShortCard({
  resource,
  commentCount,
  onOpenComments,
  onShare,
  isActive,
  suspended = false,
  showSwipeHint,
}: Props) {
  const t = useTranslations("education");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    if (paused || suspended) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [isActive, paused, suspended, resource.file_url]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTime() {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        setProgress(0);
        return;
      }
      setProgress(video.currentTime / video.duration);
    }

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onTime);
    };
  }, [resource.file_url]);

  function togglePausedFromSurface(event: React.PointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("button, a")) {
      return;
    }
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance > 12) return;
    setPaused((value) => !value);
  }

  return (
    <article
      className="education-shorts-item relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black"
      onPointerDown={(event) => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={togglePausedFromSurface}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        setPaused((value) => !value);
      }}
      tabIndex={isActive ? 0 : -1}
      aria-label={resource.title}
    >
      <video
        ref={videoRef}
        src={resource.file_url}
        className="absolute inset-0 h-full w-full object-contain"
        loop
        muted
        playsInline
        preload={isActive ? "auto" : "metadata"}
        aria-label={resource.title}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />

      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-white/20">
        <div
          className="h-full bg-white"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>

      <button
        type="button"
        aria-label={muted ? t("unmute") : t("mute")}
        className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
        onClick={() => setMuted((value) => !value)}
      >
        {muted ? <MdVolumeOff className="h-5 w-5" /> : <MdVolumeUp className="h-5 w-5" />}
      </button>

      {paused ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <MdPlayArrow className="h-10 w-10" aria-hidden />
            <span className="sr-only">{t("play")}</span>
          </span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-4 pb-6 sm:p-6">
        <div className="min-w-0 flex-1 pe-2 text-white">
          {showSwipeHint ? (
            <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
              <MdKeyboardArrowUp className="h-4 w-4" aria-hidden />
              {t("swipeHint")}
            </p>
          ) : null}
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/70">
            {resource.topic}
          </p>
          <h2 className="text-lg font-semibold leading-tight sm:text-xl">
            {resource.title}
          </h2>
          {resource.description ? (
            <p className="mt-1 line-clamp-3 text-sm text-white/85">
              {resource.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-5 pb-20">
          <div className="flex flex-col items-center gap-1 text-white">
            <FavouriteButton
              targetType="education"
              targetId={resource.id}
              variant="overlay"
              iconClassName="h-7 w-7"
            />
            <span className="text-xs font-medium">{t("save")}</span>
          </div>

          <ActionButton
            label={t("comment")}
            count={commentCount}
            onClick={onOpenComments}
          >
            <MdChatBubbleOutline className="h-7 w-7" />
          </ActionButton>

          <ActionButton label={t("share")} onClick={onShare}>
            <MdShare className="h-7 w-7" />
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function ActionButton({
  label,
  count,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="group flex flex-col items-center gap-1 text-white"
      onClick={onClick}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition",
          "group-hover:bg-black/55 group-active:scale-95"
        )}
      >
        {children}
      </span>
      {count !== undefined ? (
        <span className="text-xs font-medium tabular-nums">{formatCount(count)}</span>
      ) : (
        <span className="text-xs font-medium">{label}</span>
      )}
    </button>
  );
}
