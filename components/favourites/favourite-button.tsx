"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { StarIcon } from "@/components/favourites/star-icon";
import type { FavouriteTargetType } from "@/lib/db/types";

export function FavouriteButton({
  targetType,
  targetId,
  className,
  iconClassName,
  onChange,
}: {
  targetType: FavouriteTargetType;
  targetId: number;
  className?: string;
  iconClassName?: string;
  onChange?: (favourited: boolean) => void;
}) {
  const t = useTranslations("favourites");
  const router = useRouter();
  const [favourited, setFavourited] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          `/api/favourites?targetType=${targetType}&targetIds=${targetId}`
        );
        if (!response.ok) {
          if (!cancelled) setFavourited(false);
          return;
        }
        const data = (await response.json()) as { favouritedIds?: number[] };
        if (!cancelled) {
          setFavourited(data.favouritedIds?.includes(targetId) ?? false);
        }
      } catch {
        if (!cancelled) setFavourited(false);
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType]);

  async function toggle(event?: React.MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();
    if (busy || favourited === null) return;

    setBusy(true);
    try {
      if (favourited) {
        const response = await fetch(
          `/api/favourites?targetType=${targetType}&targetId=${targetId}`,
          { method: "DELETE" }
        );
        if (response.status === 401) {
          router.push("/sign-up");
          return;
        }
        if (response.ok) {
          setFavourited(false);
          onChange?.(false);
        }
        return;
      }

      const response = await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (response.status === 401) {
        router.push("/sign-up");
        return;
      }
      if (response.ok) {
        setFavourited(true);
        onChange?.(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void toggle(event)}
      disabled={busy || favourited === null}
      aria-pressed={favourited ?? false}
      aria-label={favourited ? t("remove") : t("add")}
      title={favourited ? t("remove") : t("add")}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1.5 transition",
        favourited
          ? "text-accent hover:bg-accent/10"
          : "text-muted hover:bg-background-soft hover:text-accent",
        busy && "opacity-60",
        className
      )}
    >
      <StarIcon filled={favourited ?? false} className={iconClassName} />
    </button>
  );
}
