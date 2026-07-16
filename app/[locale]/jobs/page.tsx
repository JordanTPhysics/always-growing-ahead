import { setRequestLocale } from "next-intl/server";
import { JobSearchView } from "@/components/map/job-search-view";

export default async function JobsBrowsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <JobSearchView />;
}
