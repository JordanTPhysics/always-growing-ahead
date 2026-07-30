"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "marketplace-likes";

function readLikedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeLikedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useMarketplaceLikes() {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setLikedIds(readLikedIds());
  }, []);

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeLikedIds(next);
      return next;
    });
  }, []);

  return { isLiked, toggleLike };
}
