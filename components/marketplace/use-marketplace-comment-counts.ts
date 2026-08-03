"use client";

import { useEffect, useState } from "react";
import { marketplacePosts } from "@/lib/marketplace/content";

export function useMarketplaceCommentCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/marketplace/comments/counts");
        if (!response.ok) return;
        const data = (await response.json()) as { counts?: Record<string, number> };
        if (!cancelled && data.counts) setCounts(data.counts);
      } catch {
        // Ignore — counts are optional UI polish
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCount = (listingId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [listingId]: count }));
  };

  const getCount = (listingId: string) => counts[listingId] ?? 0;

  const listingIds = marketplacePosts.map((post) => post.id);

  return { counts, getCount, setCount, listingIds };
}
