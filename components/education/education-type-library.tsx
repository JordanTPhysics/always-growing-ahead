"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MdChatBubbleOutline, MdShare } from "react-icons/md";
import { FavouriteButton } from "@/components/favourites/favourite-button";
import { EducationCommentsPanel } from "@/components/education/education-comments-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClassName } from "@/components/ui/forms";
import { Link } from "@/lib/i18n/navigation";
import {
  isEducationVideoType,
  type EducationTypeSlug,
} from "@/lib/education/media-types";
import type { EducationMediaType } from "@/lib/db/types";
import type { ActiveLocale } from "@/lib/i18n/locales";

export type EducationLibraryItem = {
  id: number;
  topic: string;
  media_type: EducationMediaType;
  file_url: string;
  title: string;
  description: string | null;
};

type Props = {
  slug: EducationTypeSlug;
  resources: EducationLibraryItem[];
};

function groupByTopic(items: EducationLibraryItem[]) {
  const groups = new Map<string, EducationLibraryItem[]>();
  for (const item of items) {
    const list = groups.get(item.topic) ?? [];
    list.push(item);
    groups.set(item.topic, list);
  }
  return [...groups.entries()];
}

export function EducationTypeLibrary({ slug, resources }: Props) {
  const t = useTranslations("education");
  const locale = useLocale() as ActiveLocale;
  const [query, setQuery] = useState("");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>(
    {}
  );
  const [activeComments, setActiveComments] = useState<{
    id: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (resources.length === 0) return;
    let cancelled = false;

    async function loadCounts() {
      try {
        const ids = resources.map((resource) => resource.id).join(",");
        const response = await fetch(
          `/api/education/comments/counts?ids=${encodeURIComponent(ids)}`
        );
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          counts?: Record<string, number>;
        };
        if (!data.counts || cancelled) return;
        const next: Record<number, number> = {};
        for (const [key, value] of Object.entries(data.counts)) {
          next[Number(key)] = Number(value);
        }
        setCommentCounts(next);
      } catch {
        // Counts are optional UI polish.
      }
    }

    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [resources]);

  useEffect(() => {
    if (!shareMessage) return;
    const timer = window.setTimeout(() => setShareMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [shareMessage]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return resources;
    return resources.filter(
      (resource) =>
        resource.title.toLowerCase().includes(normalized) ||
        resource.topic.toLowerCase().includes(normalized)
    );
  }, [query, resources]);

  const groups = useMemo(() => groupByTopic(filtered), [filtered]);

  async function shareResource(resource: EducationLibraryItem) {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/${locale}/education/${slug}#resource-${resource.id}`
        : `/${locale}/education/${slug}#resource-${resource.id}`;

    const shareData = {
      title: resource.title,
      text: resource.title,
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
  }

  if (resources.length === 0) {
    return (
      <Card elevation="nested" className="p-5 text-muted">
        {t("empty")}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Link
          href="/education"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          {t("backToHub")}
        </Link>
        <label className="block w-full max-w-md space-y-1.5">
          <span className="text-sm font-medium text-text">{t("filterLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("filterPlaceholder")}
            className={inputClassName}
          />
        </label>
      </div>

      {shareMessage ? (
        <p className="text-sm text-muted" role="status">
          {shareMessage}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <Card elevation="nested" className="p-5 text-muted">
          {t("filterEmpty")}
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([topic, items]) => (
            <Card key={`${slug}-${topic}`} elevation="nested" className="p-5">
              <h2 className="text-xl font-semibold text-text">{topic}</h2>
              <ul className="mt-4 space-y-6">
                {items.map((resource) => {
                  const commentCount = commentCounts[resource.id] ?? 0;

                  return (
                    <li
                      key={resource.id}
                      id={`resource-${resource.id}`}
                      className="scroll-mt-24 border-t border-border pt-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-medium text-text">
                            {resource.title}
                          </h3>
                          {resource.description ? (
                            <p className="mt-2 max-w-2xl text-sm text-muted">
                              {resource.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <FavouriteButton
                            targetType="education"
                            targetId={resource.id}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setActiveComments({
                                id: resource.id,
                                title: resource.title,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md p-1.5 text-muted transition hover:bg-background-soft hover:text-text"
                            aria-label={t("comment")}
                            title={t("comment")}
                          >
                            <MdChatBubbleOutline className="h-5 w-5" />
                            {commentCount > 0 ? (
                              <span className="text-xs font-medium">
                                {commentCount}
                              </span>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            onClick={() => void shareResource(resource)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted transition hover:bg-background-soft hover:text-text"
                            aria-label={t("share")}
                            title={t("share")}
                          >
                            <MdShare className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        {resource.media_type === "pdf" ? (
                          <Button asChild>
                            <a
                              href={resource.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("openPdf")}
                            </a>
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-muted">
                              {isEducationVideoType(resource.media_type)
                                ? t("watchVideo")
                                : null}
                            </p>
                            <video
                              controls
                              className="max-h-[28rem] w-full bg-black"
                              preload="metadata"
                              src={resource.file_url}
                            >
                              <a href={resource.file_url}>{t("watchVideo")}</a>
                            </video>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {activeComments ? (
        <EducationCommentsPanel
          resourceId={activeComments.id}
          resourceTitle={activeComments.title}
          open
          onClose={() => setActiveComments(null)}
          onCountChange={(count) =>
            setCommentCounts((prev) => ({
              ...prev,
              [activeComments.id]: count,
            }))
          }
        />
      ) : null}
    </div>
  );
}
