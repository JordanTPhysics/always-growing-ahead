"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MdAdd } from "react-icons/md";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { BottomSheet } from "@/components/map/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/forms";
import { Link } from "@/lib/i18n/navigation";
import {
  canPostMarketplace,
  marketplaceDailyPostLimit,
  type Tier,
} from "@/lib/entitlements";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplacePost,
  type MarketplaceQuota,
} from "@/lib/marketplace/types";

type Props = {
  quota: MarketplaceQuota | null;
  onCreated: (post: MarketplacePost, quota: MarketplaceQuota) => void;
};

export function MarketplaceComposer({ quota, onCreated }: Props) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<(typeof MARKETPLACE_CATEGORIES)[number]>(
    "Other"
  );

  const tier = (session?.user.tier ?? "none") as Tier;
  const canPost = Boolean(session?.user.id) && canPostMarketplace(tier);
  const limit = marketplaceDailyPostLimit(tier);
  const remaining = quota?.remaining ?? limit;
  const atLimit = canPost && remaining <= 0;

  function resetForm() {
    setFile(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setLocation("");
    setCategory("Other");
    setError(null);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    resetForm();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !title.trim() || pending || atLimit) return;

    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("title", title.trim());
      body.append("description", description.trim());
      body.append("price", price.trim());
      body.append("location", location.trim());
      body.append("category", category);

      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        post?: MarketplacePost;
        quota?: MarketplaceQuota;
      };

      if (!response.ok || !data.post || !data.quota) {
        setError(data.error ?? tCommon("status.error"));
        return;
      }

      onCreated(data.post, data.quota);
      setOpen(false);
      resetForm();
    } catch {
      setError(tCommon("status.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("upload")}
        className="absolute start-4 top-4 z-20 flex h-11 items-center gap-2 rounded-full bg-black/50 px-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-black/65"
        onClick={() => setOpen(true)}
      >
        <MdAdd className="h-5 w-5" />
        {t("upload")}
      </button>

      <BottomSheet
        open={open}
        onClose={close}
        title={t("uploadTitle")}
        desktopSidePanel={false}
      >
        {status === "loading" ? (
          <p className="text-sm text-muted">{tCommon("status.loading")}</p>
        ) : !session?.user.id ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("signInToPost")}</p>
            <Button asChild>
              <Link href="/sign-in">{t("signIn")}</Link>
            </Button>
          </div>
        ) : !canPost ? (
          <UpgradePrompt description={t("upgradeToPost")} requiredTier="basic" />
        ) : (
          <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
            <p className="text-xs text-muted">
              {atLimit
                ? t("dailyLimitReached", { limit })
                : t("dailyLimitHint", { remaining, limit })}
            </p>
            <Field label={t("mediaLabel")} hint={t("mediaHint")}>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,.mov"
                className={inputClassName}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            {file ? (
              <p className="text-xs text-muted">{file.name}</p>
            ) : null}
            <Field label={t("titleLabel")}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                required
                className={inputClassName}
              />
            </Field>
            <Field label={t("descriptionLabel")}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={3}
                className={inputClassName}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("priceLabel")}>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  maxLength={40}
                  placeholder={t("priceOnRequest")}
                  className={inputClassName}
                />
              </Field>
              <Field label={t("locationLabel")}>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  maxLength={80}
                  className={inputClassName}
                />
              </Field>
            </div>
            <Field label={t("categoryLabel")}>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as (typeof MARKETPLACE_CATEGORIES)[number]
                  )
                }
                className={inputClassName}
              >
                {MARKETPLACE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={pending || !file || !title.trim() || atLimit}>
              {pending ? t("uploading") : t("publish")}
            </Button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
