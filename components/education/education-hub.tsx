import { getTranslations } from "next-intl/server";
import { MdOndemandVideo, MdPictureAsPdf, MdSchool } from "react-icons/md";
import { Link } from "@/lib/i18n/navigation";
import {
  EDUCATION_TYPE_SLUGS,
  type EducationTypeSlug,
} from "@/lib/education/media-types";
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
    panelClassName: string;
  }
> = {
  "short-videos": {
    titleKey: "sectionShortVideos",
    hintKey: "sectionShortVideosHint",
    Icon: MdOndemandVideo,
    panelClassName:
      "bg-[linear-gradient(135deg,var(--button-happy-from),var(--button-happy-to))] text-[var(--button-happy-fg)]",
  },
  lectures: {
    titleKey: "sectionLectures",
    hintKey: "sectionLecturesHint",
    Icon: MdSchool,
    panelClassName:
      "bg-[linear-gradient(135deg,var(--button-secondary-from),var(--button-secondary-to))] text-[var(--button-secondary-fg)]",
  },
  pdf: {
    titleKey: "sectionPdfGuides",
    hintKey: "sectionPdfGuidesHint",
    Icon: MdPictureAsPdf,
    panelClassName:
      "bg-[linear-gradient(135deg,var(--button-accent-from),var(--button-accent-to))] text-[var(--button-accent-fg)]",
  },
};

export async function EducationHub() {
  const t = await getTranslations("education");

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:min-h-0 lg:flex-1">
      {EDUCATION_TYPE_SLUGS.map((slug) => {
        const { titleKey, hintKey, Icon, panelClassName } = hubMeta[slug];
        return (
          <Link
            key={slug}
            href={`/education/${slug}`}
            className={cn(
              "group flex h-full flex-col items-center justify-center gap-5 rounded-lg border border-transparent p-8 text-center shadow-panel-sm transition",
              "hover:-translate-y-0.5 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2",
              panelClassName
            )}
          >
            <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/75 text-current transition group-hover:bg-white">
              <Icon className="h-14 w-14" aria-hidden />
            </span>
            <span className="space-y-2">
              <span className="block text-xl font-semibold">{t(titleKey)}</span>
              <span className="block text-sm text-[color-mix(in_srgb,currentColor_75%,transparent)]">
                {t(hintKey)}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
