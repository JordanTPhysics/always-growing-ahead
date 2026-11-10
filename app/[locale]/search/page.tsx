import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HashLink } from "@/components/layout/hash-link";
import { SiteSearchForm } from "@/components/search/site-search-form";
import { PageSection } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/forms";
import { runSiteSearch } from "@/lib/search/run-search";
import { normalizeSearchQuery } from "@/lib/search/text";
import type { SearchHit } from "@/lib/search/types";

function firstQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const query = normalizeSearchQuery(firstQuery(q));
  return {
    title: query.length >= 2 ? t("resultsFor", { query }) : t("title"),
  };
}

function ResultList({ items }: { items: SearchHit[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <HashLink
            href={item.href}
            className="block rounded-md border border-border px-4 py-3 transition-colors hover:bg-background-soft"
          >
            <span className="font-medium text-text">{item.title}</span>
            {item.meta ? (
              <span className="mt-1 block text-xs text-muted">{item.meta}</span>
            ) : null}
            {item.snippet ? (
              <span className="mt-1 block text-sm text-muted">{item.snippet}</span>
            ) : null}
          </HashLink>
        </li>
      ))}
    </ul>
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("search");
  const query = normalizeSearchQuery(firstQuery(q));
  const ready = query.length >= 2;
  const results = ready ? await runSiteSearch(query) : null;
  const groups = results
    ? [
        { key: "page", label: t("kinds.page"), items: results.pages },
        { key: "job", label: t("kinds.job"), items: results.jobs },
        { key: "profile", label: t("kinds.profile"), items: results.profiles },
        { key: "education", label: t("kinds.education"), items: results.education },
        {
          key: "marketplace",
          label: t("kinds.marketplace"),
          items: results.marketplace,
        },
      ]
    : [];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <PageSection>
      <PageHeader
        title={ready ? t("resultsFor", { query }) : t("title")}
        subtitle={
          ready
            ? total > 0
              ? t("summary", { count: total })
              : undefined
            : t("subtitle")
        }
      />
      <SiteSearchForm initialQuery={query} />

      {query.length > 0 && !ready ? (
        <p className="text-sm text-muted">{t("tooShort")}</p>
      ) : null}

      {ready && results?.unavailable ? (
        <p role="status" className="text-sm text-muted">
          {t("unavailable")}
        </p>
      ) : null}

      {ready && total === 0 ? (
        <p className="text-muted">{t("empty", { query })}</p>
      ) : null}

      {!ready && query.length === 0 ? (
        <p className="text-muted">{t("prompt")}</p>
      ) : null}

      {groups.map((group) =>
        group.items.length > 0 ? (
          <section key={group.key} className="space-y-3">
            <h2 className="text-lg font-semibold text-text">{group.label}</h2>
            <ResultList items={group.items} />
          </section>
        ) : null
      )}
    </PageSection>
  );
}
