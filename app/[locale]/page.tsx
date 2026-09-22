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
import { HelpContent } from "@/components/help/help-content";
import { PrivacyContent } from "@/components/privacy/privacy-content";
import { FeatureGrid } from "@/components/home/feature-grid";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const tHelp = await getTranslations("help");
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
          <p className="text-lg italic font-medium uppercase tracking-[0.18em] text-muted">
            {t("appName")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl text-muted mb-0 pb-0">
            {t("tagline")}
          </h1>
          <div className="h-[1px] w-screen bg-white absolute left-0"></div>
          <p className="text-lg text-white pt-4">
            {t("description")}
          </p>
        </div>
        <FeatureGrid
          kicker={t("features.kicker")}
          items={[
            {
              title: t("features.findWork.title"),
              body: t("features.findWork.body"),
              href: "/jobs",
              imageSrc: "/images/home/find-work.jpg",
              imageAlt: t("features.findWork.imageAlt"),
            },
            {
              title: t("features.hire.title"),
              body: t("features.hire.body"),
              href: "/workers",
              imageSrc: "/images/home/hire.jpg",
              imageAlt: t("features.hire.imageAlt"),
            },
            {
              title: t("features.learn.title"),
              body: t("features.learn.body"),
              href: "/education",
              imageSrc: "/images/home/learn.jpg",
              imageAlt: t("features.learn.imageAlt"),
            },
            {
              title: t("features.marketplace.title"),
              body: t("features.marketplace.body"),
              href: "/marketplace",
              imageSrc: "/images/home/marketplace.jpg",
              imageAlt: t("features.marketplace.imageAlt"),
            },
            {
              title: t("features.content.title"),
              body: t("features.content.body"),
              href: "/marketplace",
              imageSrc: "/images/home/content.jpg",
              imageAlt: t("features.content.imageAlt"),
            },
          ]}
        />
        <SponsoredCarousel items={[...sponsoredItems].reverse()} />
      </section>

      <section id="help" className="scroll-mt-6 space-y-6">
        <div className="w-full space-y-4">
          <h2 className="text-4xl font-semibold tracking-tight text-muted sm:text-5xl mb-0 pb-0">
            {tHelp("title")}
          </h2>
          <div className="h-[1px] w-screen bg-white absolute left-0"></div>
          <p className="text-lg text-white pt-4">{tHelp("subtitle")}</p>
        </div>
        <HelpContent />
      </section>

      <section id="privacy" className="scroll-mt-6">
        <PrivacyContent />
      </section>
    </div>
  );
}
