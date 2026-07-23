import { getTranslations } from "next-intl/server";
import type { EducationResource } from "@/lib/db/types";
import type { ActiveLocale } from "@/lib/i18n/locales";
import {
  groupEducationByTopic,
  localizedEducationDescription,
  localizedEducationTitle,
} from "@/lib/education/localize";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  locale: ActiveLocale;
  resources: EducationResource[];
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

  const groups = groupEducationByTopic(resources);

  return (
    <div className="space-y-10">
      {groups.map(([topic, items]) => (
        <Card key={topic} elevation="nested" className="p-5">
          <h2 className="text-xl font-semibold text-text">{topic}</h2>
          <ul className="mt-4 space-y-6">
            {items.map((resource) => {
              const title = localizedEducationTitle(resource, locale);
              const description = localizedEducationDescription(
                resource,
                locale
              );
              return (
                <li key={resource.id} className="border-t border-border pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-medium text-text">{title}</h3>
                    <span className="text-xs uppercase tracking-wide text-muted">
                      {resource.media_type === "pdf"
                        ? t("typePdf")
                        : t("typeVideo")}
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
                        <p className="text-sm text-muted">{t("watchVideo")}</p>
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
  );
}
