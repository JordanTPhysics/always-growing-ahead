"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MdChatBubbleOutline,
  MdFavorite,
  MdFavoriteBorder,
  MdShare,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { Link } from "@/lib/i18n/routing";
import type { MarketplacePost } from "@/lib/marketplace/types";
import { marketplaceSellerHref } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

type Props = {
  post: MarketplacePost;
  liked: boolean;
  commentCount: number;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  isActive: boolean;
};

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export function MarketplacePostCard({
  post,
  liked,
  commentCount,
  onToggleLike,
  onOpenComments,
  onShare,
  isActive,
}: Props) {
  const t = useTranslations("marketplace");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const likeCount = post.likes + (liked ? 1 : 0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post.mediaType !== "video") return;

    if (isActive) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive, post.mediaType]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return (
    <article className="marketplace-snap-item relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {post.mediaType === "video" ? (
        <video
          ref={videoRef}
          src={post.mediaUrl}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={post.title}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.mediaUrl}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

      {post.mediaType === "video" ? (
        <button
          type="button"
          aria-label={muted ? t("unmute") : t("mute")}
          className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
          onClick={toggleMute}
        >
          {muted ? <MdVolumeOff className="h-5 w-5" /> : <MdVolumeUp className="h-5 w-5" />}
        </button>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 p-4 pb-6 sm:p-6">
        <div className="min-w-0 flex-1 pe-2 text-white">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/70">
            {post.category} · {post.location}
          </p>
          <h2 className="text-lg font-semibold leading-tight sm:text-xl">{post.title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-white/85">{post.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-foreground px-3 py-1 text-sm font-semibold text-white">
              {post.price}
            </span>
            <span className="text-sm text-white/80">
              {t("by")}{" "}
              <Link
                href={marketplaceSellerHref(post.seller)}
                className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 font-medium text-white transition hover:bg-white/20"
              >
                {post.seller.displayName}
              </Link>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-5 pb-2">
          <ActionButton
            label={t("like")}
            count={likeCount}
            active={liked}
            onClick={onToggleLike}
          >
            {liked ? (
              <MdFavorite className="h-7 w-7 text-red-500" />
            ) : (
              <MdFavoriteBorder className="h-7 w-7" />
            )}
          </ActionButton>

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
  active,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className="group flex flex-col items-center gap-1 text-white"
      onClick={onClick}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition",
          "group-hover:bg-black/55 group-active:scale-95",
          active && "bg-red-500/20"
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
