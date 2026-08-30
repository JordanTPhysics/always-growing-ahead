import { getTranslations, setRequestLocale } from "next-intl/server";
import { SponsoredCarousel } from "@/components/sponsored/sponsored-carousel";
import { NewsUpdatesBanner } from "@/components/news/news-updates-banner";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { auth } from "@/auth";
import { sponsoredItems } from "@/lib/sponsored/content";
import Carousel from "@/components/ui/carousel";
import { listPublishedNewsExcerpts } from "@/lib/db/repositories/news-excerpts";
import { isAdmin } from "@/lib/db/repositories/users";
import { isActiveLocale } from "@/lib/i18n/locales";
import { localizedNewsBody } from "@/lib/news/localize";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const session = await auth();
  const isAdminUser =
    !!session?.user?.id && (await isAdmin(Number(session.user.id)));

  const activeLocale = isActiveLocale(locale) ? locale : "en";
  const newsExcerpts = (
    await listPublishedNewsExcerpts()
  ).map((excerpt) => localizedNewsBody(excerpt, activeLocale));

  return (
    <div className="mx-auto flex flex-col gap-8">
      <div className="-mx-4 -mt-8 mb-8 sm:-mx-6">
        <Carousel />
        {newsExcerpts.length > 0 || isAdminUser ? (
          <div className="flex items-stretch border-1 border-white rounded-md bg-slate-700 text-white mt-2 px-2 lg:mx-16">
            <div className="min-w-0 flex-1">
              {newsExcerpts.length > 0 ? (
                <NewsUpdatesBanner
                  excerpts={newsExcerpts}
                  label={t("news.label")}
                />
              ) : (
                <div className="px-4 py-2 text-sm text-background/70">
                  {t("news.empty")}
                </div>
              )}
            </div>
            {isAdminUser ? (
              <div className="flex shrink-0 items-center py-1">
                  <Link className="text-white hover:underline font-semibold" href="/admin/news">{t("news.manage")}</Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="space-y-8">
        <SponsoredCarousel items={sponsoredItems} />
        <div className="w-full space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted">
            {t("appName")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl text-muted">
            {t("tagline")}
          </h1>
          <p className="text-lg text-white">
            {t("description")}
          </p>
        </div>
        <SponsoredCarousel items={[...sponsoredItems].reverse()} />
      </section>
    </div>
  );
}
