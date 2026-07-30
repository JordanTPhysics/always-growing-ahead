import { setRequestLocale } from "next-intl/server";
import { MarketplaceFeed } from "@/components/marketplace/marketplace-feed";

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="fixed inset-x-0 top-[3.75rem] bottom-0 z-10 -mx-4 sm:-mx-6">
      <MarketplaceFeed />
    </div>
  );
}
