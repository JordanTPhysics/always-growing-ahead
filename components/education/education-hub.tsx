import { getTranslations } from "next-intl/server";
import { MdOndemandVideo, MdPictureAsPdf, MdSchool } from "react-icons/md";
import { Link } from "@/lib/i18n/navigation";
import {
  EDUCATION_TYPE_SLUGS,
  type EducationTypeSlug,
} from "@/lib/education/media-types";
import { nestedPanelClassName } from "@/lib/ui-styles";
import { cn } from "@/lib/utils";

const hubMeta: Record<
  EducationTypeSlug,
  {
    titleKey: "sectionShortVideos" | "sectionLectures" | "sectionPdfGuides";
    hintKey:
      | "sectionShortVideosHint"
      | "sectionLecturesHint"
      | "sectionPdfGuidesHint";
    Icon: typeof MdOndemandVideo;
  }
> = {
  "short-videos": {
    titleKey: "sectionShortVideos",
    hintKey: "sectionShortVideosHint",
    Icon: MdOndemandVideo,
  },
  lectures: {
    titleKey: "sectionLectures",
    hintKey: "sectionLecturesHint",
    Icon: MdSchool,
  },
  pdf: {
    titleKey: "sectionPdfGuides",
    hintKey: "sectionPdfGuidesHint",
    Icon: MdPictureAsPdf,
  },
};

export async function EducationHub() {
  const t = await getTranslations("education");

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {EDUCATION_TYPE_SLUGS.map((slug) => {
        const { titleKey, hintKey, Icon } = hubMeta[slug];
        return (
          <Link
            key={slug}
            href={`/education/${slug}`}
            className={cn(
              nestedPanelClassName,
              "group flex flex-col items-center gap-4 p-8 text-center transition",
              "hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            )}
          >
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-background-soft text-accent transition group-hover:bg-accent/10">
              <Icon className="h-14 w-14" aria-hidden />
            </span>
            <span className="space-y-2">
              <span className="block text-xl font-semibold text-text">
                {t(titleKey)}
              </span>
              <span className="block text-sm text-muted">{t(hintKey)}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
