import { getTranslations, setRequestLocale } from "next-intl/server";
import { SponsoredCarousel } from "@/components/sponsored/sponsored-carousel";
import { Link } from "@/lib/i18n/routing";
import { auth } from "@/auth";
import { sponsoredItems } from "@/lib/sponsored/content";
import Carousel from "@/components/ui/carousel";

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
    <div className="mx-auto flex flex-col gap-8">
      <div className="-mx-4 -mt-8 mb-8 sm:-mx-6">
        <Carousel />
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
          Search the map, reveal contact details on a plan, and manage hiring from
          one account — on web or in the native app shell.
        </p>
      </div>
      <SponsoredCarousel items={[...sponsoredItems].reverse()} />

      </section>
    </div >
  );
}
