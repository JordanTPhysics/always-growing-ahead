import { setRequestLocale } from "next-intl/server";
import { JobSearchView } from "@/components/map/job-search-view";
import { getMapsBrowserConfig } from "@/lib/maps/browser-config";

export default async function JobsBrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const maps = await getMapsBrowserConfig();
  return <JobSearchView mapsApiKey={maps.apiKey} mapsMapId={maps.mapId} />;
}
