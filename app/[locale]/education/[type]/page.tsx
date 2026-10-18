import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EducationTypeLibrary } from "@/components/education/education-type-library";
import { PageHeader } from "@/components/ui/forms";
import { PageSection } from "@/components/ui/card";
import { requireAuthOrSignUp } from "@/lib/auth/require-auth";
import { listPublishedEducationResourcesByMediaType } from "@/lib/db/repositories/education";
import { resolveStoredFileUrl } from "@/lib/storage";
import {
  localizedEducationDescription,
  localizedEducationTitle,
} from "@/lib/education/localize";
import {
  educationSlugToMediaType,
  isEducationTypeSlug,
  type EducationTypeSlug,
} from "@/lib/education/media-types";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";

const titleKeyBySlug: Record<
  EducationTypeSlug,
  "sectionShortVideos" | "sectionLectures" | "sectionPdfGuides"
> = {
  "short-videos": "sectionShortVideos",
  lectures: "sectionLectures",
  pdf: "sectionPdfGuides",
};

const subtitleKeyBySlug: Record<
  EducationTypeSlug,
  "sectionShortVideosHint" | "sectionLecturesHint" | "sectionPdfGuidesHint"
> = {
  "short-videos": "sectionShortVideosHint",
  lectures: "sectionLecturesHint",
  pdf: "sectionPdfGuidesHint",
};

export default async function EducationTypePage({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale: localeParam, type } = await params;
  if (!isEducationTypeSlug(type)) notFound();

  const locale: ActiveLocale = isActiveLocale(localeParam)
    ? localeParam
    : "en";
  setRequestLocale(locale);

  await requireAuthOrSignUp(locale, {
    notice: "education",
    next: `/education/${type}`,
  });

  const mediaType = educationSlugToMediaType(type);
  const [t, resources] = await Promise.all([
    getTranslations("education"),
    listPublishedEducationResourcesByMediaType(mediaType),
  ]);

  const libraryItems = await Promise.all(
    resources.map(async (resource) => ({
      id: resource.id,
      topic: resource.topic,
      media_type: resource.media_type,
      file_url:
        (await resolveStoredFileUrl(resource.file_url)) ?? resource.file_url,
      title: localizedEducationTitle(resource, locale),
      description: localizedEducationDescription(resource, locale),
    }))
  );

  return (
    <PageSection>
      <PageHeader
        title={t(titleKeyBySlug[type])}
        subtitle={t(subtitleKeyBySlug[type])}
      />
      <EducationTypeLibrary slug={type} resources={libraryItems} />
    </PageSection>
  );
}
