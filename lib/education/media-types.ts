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

export function isEducationMediaType(value: string): value is EducationMediaType {
  return EDUCATION_MEDIA_TYPES.includes(value as EducationMediaType);
}

export function isEducationVideoType(
  mediaType: EducationMediaType
): mediaType is "short_video" | "lecture" {
  return mediaType === "short_video" || mediaType === "lecture";
}
