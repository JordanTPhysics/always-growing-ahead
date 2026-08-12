import type { EducationMediaType } from "@/lib/db/types";

export const EDUCATION_MEDIA_TYPES = [
  "short_video",
  "lecture",
  "pdf",
] as const satisfies readonly EducationMediaType[];

export const EDUCATION_SECTION_ORDER: EducationMediaType[] = [
  "short_video",
  "lecture",
  "pdf",
];

export const EDUCATION_TYPE_SLUGS = [
  "short-videos",
  "lectures",
  "pdf",
] as const;

export type EducationTypeSlug = (typeof EDUCATION_TYPE_SLUGS)[number];

const SLUG_TO_MEDIA_TYPE: Record<EducationTypeSlug, EducationMediaType> = {
  "short-videos": "short_video",
  lectures: "lecture",
  pdf: "pdf",
};

const MEDIA_TYPE_TO_SLUG: Record<EducationMediaType, EducationTypeSlug> = {
  short_video: "short-videos",
  lecture: "lectures",
  pdf: "pdf",
};

export function isEducationMediaType(value: string): value is EducationMediaType {
  return EDUCATION_MEDIA_TYPES.includes(value as EducationMediaType);
}

export function isEducationTypeSlug(value: string): value is EducationTypeSlug {
  return EDUCATION_TYPE_SLUGS.includes(value as EducationTypeSlug);
}

export function educationSlugToMediaType(
  slug: EducationTypeSlug
): EducationMediaType {
  return SLUG_TO_MEDIA_TYPE[slug];
}

export function educationMediaTypeToSlug(
  mediaType: EducationMediaType
): EducationTypeSlug {
  return MEDIA_TYPE_TO_SLUG[mediaType];
}

export function isEducationVideoType(
  mediaType: EducationMediaType
): mediaType is "short_video" | "lecture" {
  return mediaType === "short_video" || mediaType === "lecture";
}
