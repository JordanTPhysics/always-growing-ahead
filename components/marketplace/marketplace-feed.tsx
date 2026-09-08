"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { marketplacePosts } from "@/lib/marketplace/content";
import type { MarketplacePost, MarketplaceQuota } from "@/lib/marketplace/types";
import { MarketplaceComposer } from "@/components/marketplace/marketplace-composer";
import { MarketplacePostCard } from "@/components/marketplace/marketplace-post-card";
import { MarketplaceCommentsPanel } from "@/components/marketplace/marketplace-comments-panel";
import { useMarketplaceCommentCounts } from "@/components/marketplace/use-marketplace-comment-counts";
import { useMarketplaceLikes } from "@/components/marketplace/use-marketplace-likes";

export function MarketplaceFeed() {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const { isLiked, toggleLike } = useMarketplaceLikes();
  const [posts, setPosts] = useState<MarketplacePost[]>(marketplacePosts);
  const [quota, setQuota] = useState<MarketplaceQuota | null>(null);
  const listingIds = posts.map((post) => post.id);
  const { getCount, setCount } = useMarketplaceCommentCounts(listingIds);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const commentsPost = commentsPostId
    ? posts.find((post) => post.id === commentsPostId) ?? null
    : null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/marketplace/listings");
        if (!response.ok) return;
        const data = (await response.json()) as {
          posts?: MarketplacePost[];
          quota?: MarketplaceQuota | null;
        };
        if (cancelled) return;
        if (Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        }
        if (data.quota) setQuota(data.quota);
      } catch {
        // Keep demo posts if the feed API is unavailable
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = itemRefs.current.findIndex((el) => el === entry.target);
          if (index >= 0) setActiveIndex(index);
        }
      },
      { root: container, threshold: 0.6 }
    );

    itemRefs.current.length = posts.length;
    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [posts]);

  useEffect(() => {
    if (!shareMessage) return;
    const timer = window.setTimeout(() => setShareMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  const sharePost = useCallback(
    async (postId: string, title: string) => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/${locale}/marketplace#${postId}`
          : `/${locale}/marketplace#${postId}`;

      const shareData = {
        title,
        text: title,
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

  function onCreated(post: MarketplacePost, nextQuota: MarketplaceQuota) {
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setQuota(nextQuota);
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="marketplace-feed h-full w-full overflow-y-auto overscroll-y-contain scroll-smooth"
        aria-label={t("feedLabel")}
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            id={post.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="h-full w-full"
          >
            <MarketplacePostCard
              post={post}
              liked={isLiked(post.id)}
              commentCount={getCount(post.id)}
              onToggleLike={() => toggleLike(post.id)}
              onOpenComments={() => setCommentsPostId(post.id)}
              onShare={() => void sharePost(post.id, post.title)}
              isActive={activeIndex === index}
            />
          </div>
        ))}
      </div>

      <MarketplaceComposer quota={quota} onCreated={onCreated} />

      {shareMessage ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-auto w-fit rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm"
        >
          {shareMessage}
        </div>
      ) : null}

      {commentsPost ? (
        <MarketplaceCommentsPanel
          listingId={commentsPost.id}
          listingTitle={commentsPost.title}
          open
          onClose={() => setCommentsPostId(null)}
          onCountChange={(count) => setCount(commentsPost.id, count)}
        />
      ) : null}
    </div>
  );
}
