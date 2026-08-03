import { getTranslations } from "next-intl/server";
import type { EducationMediaType, EducationResource } from "@/lib/db/types";
import type { ActiveLocale } from "@/lib/i18n/locales";
import {
  groupEducationByTopic,
  localizedEducationDescription,
  localizedEducationTitle,
} from "@/lib/education/localize";
import {
  EDUCATION_SECTION_ORDER,
  isEducationVideoType,
} from "@/lib/education/media-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  locale: ActiveLocale;
  resources: EducationResource[];
};

const sectionTitleKey: Record<
  EducationMediaType,
  "sectionShortVideos" | "sectionLectures" | "sectionPdfGuides"
> = {
  short_video: "sectionShortVideos",
  lecture: "sectionLectures",
  pdf: "sectionPdfGuides",
};

const sectionSubtitleKey: Record<
  EducationMediaType,
  "sectionShortVideosHint" | "sectionLecturesHint" | "sectionPdfGuidesHint"
> = {
  short_video: "sectionShortVideosHint",
  lecture: "sectionLecturesHint",
  pdf: "sectionPdfGuidesHint",
};

export async function EducationLibrary({ locale, resources }: Props) {
  const t = await getTranslations("education");

  if (resources.length === 0) {
    return (
      <Card elevation="nested" className="p-5 text-muted">
        {t("empty")}
      </Card>
    );
  }

  const sections = EDUCATION_SECTION_ORDER.map((mediaType) => ({
    mediaType,
    resources: resources.filter((resource) => resource.media_type === mediaType),
  })).filter((section) => section.resources.length > 0);

  return (
    <div className="space-y-12">
      {sections.map(({ mediaType, resources: sectionResources }) => {
        const groups = groupEducationByTopic(sectionResources);

        return (
          <section key={mediaType} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-text">
                {t(sectionTitleKey[mediaType])}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {t(sectionSubtitleKey[mediaType])}
              </p>
            </div>

            <div className="space-y-6">
              {groups.map(([topic, items]) => (
                <Card key={`${mediaType}-${topic}`} elevation="nested" className="p-5">
                  <h3 className="text-xl font-semibold text-text">{topic}</h3>
                  <ul className="mt-4 space-y-6">
                    {items.map((resource) => {
                      const title = localizedEducationTitle(resource, locale);
                      const description = localizedEducationDescription(
                        resource,
                        locale
                      );
                      return (
                        <li
                          key={resource.id}
                          className="border-t border-border pt-4"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="text-lg font-medium text-text">
                              {title}
                            </h4>
                            <span className="text-xs uppercase tracking-wide text-muted">
                              {resource.media_type === "pdf"
                                ? t("typePdf")
                                : resource.media_type === "lecture"
                                  ? t("typeLecture")
                                  : t("typeShortVideo")}
                            </span>
                          </div>
                          {description ? (
                            <p className="mt-2 max-w-2xl text-sm text-muted">
                              {description}
                            </p>
                          ) : null}
                          <div className="mt-4">
                            {resource.media_type === "pdf" ? (
                              <Button asChild>
                                <a
                                  href={resource.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {t("openPdf")}
                                </a>
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-sm text-muted">
                                  {isEducationVideoType(resource.media_type)
                                    ? t("watchVideo")
                                    : null}
                                </p>
                                <video
                                  controls
                                  className="max-h-[28rem] w-full bg-black"
                                  preload="metadata"
                                  src={resource.file_url}
                                >
                                  <a href={resource.file_url}>{t("watchVideo")}</a>
                                </video>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
