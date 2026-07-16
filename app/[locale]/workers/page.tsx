import { setRequestLocale } from "next-intl/server";
import { WorkerSearchView } from "@/components/map/worker-search-view";

export default async function WorkersBrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WorkerSearchView />;
}
