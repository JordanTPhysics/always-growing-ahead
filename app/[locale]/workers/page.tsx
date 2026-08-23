import { setRequestLocale } from "next-intl/server";
import { WorkerSearchView } from "@/components/map/worker-search-view";
import { getMapsBrowserConfig } from "@/lib/maps/browser-config";

export default async function WorkersBrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const maps = await getMapsBrowserConfig();
  return (
    <WorkerSearchView mapsApiKey={maps.apiKey} mapsMapId={maps.mapId} />
  );
}
