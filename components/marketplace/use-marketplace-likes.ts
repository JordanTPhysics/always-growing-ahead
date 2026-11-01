"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { authHref } from "@/lib/auth/continue-path";

export function useMarketplaceLikes(listingIds: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const listingKey = listingIds.join(",");
  const pendingRef = useRef(new Set<string>());
  const likedIdsRef = useRef(likedIds);
  const countsRef = useRef(counts);
  likedIdsRef.current = likedIds;
  countsRef.current = counts;
  // Taps that happened after a list request started. That response must not undo them.
  const localRef = useRef(new Map<string, { liked: boolean; count: number }>());

  useEffect(() => {
    if (!listingKey) return;
    let cancelled = false;
    const localAtStart = new Map(localRef.current);

    async function load() {
      try {
        const response = await fetch(
          `/api/marketplace/likes?ids=${encodeURIComponent(listingKey)}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          counts?: Record<string, number>;
          likedIds?: string[];
        };
        if (cancelled) return;

        setCounts(() => {
          const next = { ...(data.counts ?? {}) };
          for (const [id, like] of localRef.current) {
            if (localAtStart.get(id) === like) continue;
            next[id] = like.count;
          }
          return next;
        });
        setLikedIds(() => {
          const next = new Set(data.likedIds ?? []);
          for (const [id, like] of localRef.current) {
            if (localAtStart.get(id) === like) continue;
            if (like.liked) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      } catch {
        // Counts stay at zero if the likes API is unavailable
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [listingKey]);

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  const getLikeCount = useCallback(
    (id: string) => counts[id] ?? 0,
    [counts]
  );

  const toggleLike = useCallback(
    async (id: string) => {
      if (pendingRef.current.has(id)) return;
      pendingRef.current.add(id);

      const prior = localRef.current.get(id);
      const hadPrior = localRef.current.has(id);
      const wasLiked = prior?.liked ?? likedIdsRef.current.has(id);
      const previousCount = prior?.count ?? countsRef.current[id] ?? 0;
      const optimistic = {
        liked: !wasLiked,
        count: Math.max(0, previousCount + (wasLiked ? -1 : 1)),
      };
      localRef.current.set(id, optimistic);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (optimistic.liked) next.add(id);
        else next.delete(id);
        return next;
      });
      setCounts((prev) => ({ ...prev, [id]: optimistic.count }));

      const revert = () => {
        if (hadPrior && prior) localRef.current.set(id, prior);
        else localRef.current.delete(id);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(id);
          else next.delete(id);
          return next;
        });
        setCounts((prev) => ({ ...prev, [id]: previousCount }));
      };

      try {
        const response = await fetch(
          `/api/marketplace/listings/${encodeURIComponent(id)}/likes`,
          { method: wasLiked ? "DELETE" : "POST", cache: "no-store" }
        );

        if (response.status === 401) {
          revert();
          router.push(authHref("/sign-up", { next: pathname }));
          return;
        }

        if (!response.ok) {
          revert();
          return;
        }

        const data = (await response.json()) as {
          liked?: boolean;
          count?: number;
        };
        const confirmed = {
          liked: typeof data.liked === "boolean" ? data.liked : optimistic.liked,
          count: typeof data.count === "number" ? data.count : optimistic.count,
        };
        localRef.current.set(id, confirmed);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (confirmed.liked) next.add(id);
          else next.delete(id);
          return next;
        });
        setCounts((prev) => ({ ...prev, [id]: confirmed.count }));
      } catch {
        revert();
      } finally {
        pendingRef.current.delete(id);
      }
    },
    [pathname, router]
  );

  return { isLiked, getLikeCount, toggleLike };
}
