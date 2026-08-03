"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import { BottomSheet } from "@/components/map/bottom-sheet";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/forms";
import type { MarketplaceCommentListItem } from "@/lib/db/types";

type Props = {
  listingId: string;
  listingTitle: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

function formatCommentTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MarketplaceCommentsPanel({
  listingId,
  listingTitle,
  open,
  onClose,
  onCountChange,
}: Props) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [comments, setComments] = useState<MarketplaceCommentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/marketplace/listings/${encodeURIComponent(listingId)}/comments`
      );
      if (!response.ok) {
        setError(tCommon("status.error"));
        return;
      }
      const data = (await response.json()) as {
        comments?: MarketplaceCommentListItem[];
        total?: number;
      };
      const nextComments = data.comments ?? [];
      setComments(nextComments);
      onCountChange?.(data.total ?? nextComments.length);
    } catch {
      setError(tCommon("status.error"));
    } finally {
      setLoading(false);
    }
  }, [listingId, onCountChange, tCommon]);

  useEffect(() => {
    if (!open) return;
    void loadComments();
  }, [open, loadComments]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/marketplace/listings/${encodeURIComponent(listingId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        }
      );

      if (response.status === 401) {
        router.push("/sign-up");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? tCommon("status.error"));
        return;
      }

      const data = (await response.json()) as {
        comment?: MarketplaceCommentListItem;
      };
      if (data.comment) {
        setComments((prev) => {
          const next = [...prev, data.comment!];
          onCountChange?.(next.length);
          return next;
        });
      }
      setBody("");
    } catch {
      setError(tCommon("status.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("commentsTitle", { title: listingTitle })}
      desktopSidePanel={false}
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted">{tCommon("status.loading")}</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted">{t("noComments")}</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-md border border-border bg-background-soft p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-text">
                    {comment.author_name}
                  </p>
                  <time
                    dateTime={new Date(comment.created_at).toISOString()}
                    className="shrink-0 text-xs text-muted"
                  >
                    {formatCommentTime(comment.created_at)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">
              {t("addComment")}
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t("commentPlaceholder")}
              className={inputClassName}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending ? tCommon("status.loading") : t("postComment")}
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
