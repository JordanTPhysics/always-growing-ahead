import type { EducationResource } from "@/lib/db/types";
import type { ActiveLocale } from "@/lib/i18n/locales";

export function localizedEducationTitle(
  resource: EducationResource,
  locale: ActiveLocale
) {
  if (locale === "ar") return resource.title_ar || resource.title_en;
  if (locale === "ckb") return resource.title_ckb || resource.title_en;
  return resource.title_en;
}

export function localizedEducationDescription(
  resource: EducationResource,
  locale: ActiveLocale
) {
  if (locale === "ar") {
    return resource.description_ar || resource.description_en;
  }
  if (locale === "ckb") {
    return resource.description_ckb || resource.description_en;
  }
  return resource.description_en;
}

export function groupEducationByTopic(resources: EducationResource[]) {
  const groups = new Map<string, EducationResource[]>();
  for (const resource of resources) {
    const list = groups.get(resource.topic) ?? [];
    list.push(resource);
    groups.set(resource.topic, list);
  }
  return [...groups.entries()];
}
