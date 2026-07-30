import { getTranslations, setRequestLocale } from "next-intl/server";
import { SponsoredCarousel } from "@/components/sponsored/sponsored-carousel";
import { Link } from "@/lib/i18n/routing";
import { auth } from "@/auth";
import { sponsoredItems } from "@/lib/sponsored/content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const session = await auth();

  return (
    <section className="space-y-8">
      <SponsoredCarousel items={sponsoredItems} />
      <div className="max-w-2xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
          {t("appName")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl text-muted">
          {t("tagline")}
        </h1>
        <p className="text-lg text-white">
          Search the map, reveal contact details on a plan, and manage hiring from
          one account — on web or in the native app shell.
        </p>
      </div>

      

      <div className="flex flex-wrap gap-3 font-semibold">
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center rounded-md bg-foreground px-5 py-2.5 text-white"
        >
          {t("nav.findWork")}
        </Link>
        <Link
          href="/workers"
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-5 py-2.5"
        >
          {t("nav.hire")}
        </Link>
        <Link
          href="/help"
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-5 py-2.5"
        >
          {t("nav.help")}
        </Link>
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-5 py-2.5"
        >
          {t("nav.pricing")}
        </Link>
        {!session ? (
          <Link
            href="/sign-up"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-5 py-2.5 text-white"
          >
            {t("nav.signUp")}
          </Link>
        ) : null}
      </div>
      <SponsoredCarousel items={sponsoredItems.reverse()} />

    </section>
  );
}
