"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import type { FavouriteListItem, FavouriteTargetType } from "@/lib/db/types";

function favouriteHref(favourite: FavouriteListItem): string {
  if (favourite.target_type === "education") {
    const base = favourite.link_base ?? "/education";
    return `${base}#resource-${favourite.target_id}`;
  }
  if (favourite.target_type === "job") return `/jobs/${favourite.target_id}`;
  if (favourite.target_type === "worker") {
    return `/workers/${favourite.target_id}`;
  }
  return `/employers/${favourite.target_id}`;
}

function FavouriteRow({
  favourite,
  onRemove,
}: {
  favourite: FavouriteListItem;
  onRemove: (id: number) => void;
}) {
  const t = useTranslations("favourites");

  return (
    <li className="flex items-start gap-3 rounded-md border border-border p-3">
      <FavouriteButton
        targetType={favourite.target_type}
        targetId={favourite.target_id}
        onChange={(favourited) => {
          if (!favourited) onRemove(favourite.id);
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {t(`types.${favourite.target_type}`)}
        </p>
        <Link
          href={favouriteHref(favourite)}
          className="mt-0.5 block font-medium text-text underline-offset-2 hover:underline"
        >
          {favourite.label ?? t("untitled")}
        </Link>
        {favourite.subtitle ? (
          <p className="mt-1 truncate text-sm text-muted">{favourite.subtitle}</p>
        ) : null}
      </div>
    </li>
  );
}

export function FavouritesPanel() {
  const t = useTranslations("favourites");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | FavouriteTargetType>("all");
  const [favourites, setFavourites] = useState<FavouriteListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query =
          filter === "all" ? "" : `?targetType=${encodeURIComponent(filter)}`;
        const response = await fetch(`/api/favourites${query}`);
        if (!response.ok) {
          if (!cancelled) setError(tCommon("status.error"));
          return;
        }
        const data = (await response.json()) as { favourites?: FavouriteListItem[] };
        if (!cancelled) setFavourites(data.favourites ?? []);
      } catch {
        if (!cancelled) setError(tCommon("status.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, tCommon]);

  const filters: Array<{ key: "all" | FavouriteTargetType; label: string }> = [
    { key: "all", label: t("filters.all") },
    { key: "job", label: t("filters.jobs") },
    { key: "worker", label: t("filters.workers") },
    { key: "employer", label: t("filters.companies") },
    { key: "education", label: t("filters.education") },
  ];

  return (
    <PageSection className="mt-8">
      <div className="mb-4 space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={filter === item.key ? "default" : "secondary"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <Card elevation="nested" className="p-4">
        {loading ? (
          <p className="text-sm text-muted">{tCommon("status.loading")}</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : favourites.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {favourites.map((favourite) => (
              <FavouriteRow
                key={favourite.id}
                favourite={favourite}
                onRemove={(id) =>
                  setFavourites((current) => current.filter((item) => item.id !== id))
                }
              />
            ))}
          </ul>
        )}
      </Card>
    </PageSection>
  );
}
