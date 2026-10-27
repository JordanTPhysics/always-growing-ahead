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

  useEffect(() => {
    if (!listingKey) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/marketplace/likes?ids=${encodeURIComponent(listingKey)}`
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          counts?: Record<string, number>;
          likedIds?: string[];
        };
        if (cancelled) return;

        const pending = pendingRef.current;
        setCounts((prev) => {
          const next = { ...(data.counts ?? {}) };
          for (const id of pending) {
            if (id in prev) next[id] = prev[id];
          }
          return next;
        });
        setLikedIds((prev) => {
          const next = new Set(data.likedIds ?? []);
          for (const id of pending) {
            if (prev.has(id)) next.add(id);
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

      const wasLiked = likedIdsRef.current.has(id);
      const previousCount = countsRef.current[id] ?? 0;

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(id);
        else next.add(id);
        return next;
      });
      setCounts((prev) => ({
        ...prev,
        [id]: Math.max(0, previousCount + (wasLiked ? -1 : 1)),
      }));

      const revert = () => {
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
          { method: wasLiked ? "DELETE" : "POST" }
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
        if (typeof data.count === "number") {
          setCounts((prev) => ({ ...prev, [id]: data.count as number }));
        }
        if (typeof data.liked === "boolean") {
          setLikedIds((prev) => {
            const next = new Set(prev);
            if (data.liked) next.add(id);
            else next.delete(id);
            return next;
          });
        }
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
