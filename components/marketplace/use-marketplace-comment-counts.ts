"use client";

import { useEffect, useState } from "react";

export function useMarketplaceCommentCounts(listingIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const listingKey = listingIds.join(",");

  useEffect(() => {
    if (!listingKey) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/marketplace/comments/counts?ids=${encodeURIComponent(listingKey)}`
        );
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
  }, [listingKey]);

  const setCount = (listingId: string, count: number) => {
    setCounts((prev) => ({ ...prev, [listingId]: count }));
  };

  const getCount = (listingId: string) => counts[listingId] ?? 0;

  return { counts, getCount, setCount };
}
