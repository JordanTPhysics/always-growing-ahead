import { getLocale, getTranslations } from "next-intl/server";
import { searchSiteContent, type SiteProfileHit } from "@/lib/db/repositories/site-search";
import {
  localizedEducationDescription,
  localizedEducationTitle,
} from "@/lib/education/localize";
import { educationMediaTypeToSlug } from "@/lib/education/media-types";
import { isActiveLocale, type ActiveLocale } from "@/lib/i18n/locales";
import { snippet } from "@/lib/search/text";
import type { EducationResource, JobType } from "@/lib/db/types";
import type { SearchHit, SiteSearchResults } from "@/lib/search/types";

const HELP_KEYS = [
  "subtitle",
  "tutorialsTitle",
  "faqTitle",
  "educationCta",
  "tutorialItems.account.title",
  "tutorialItems.account.step1",
  "tutorialItems.account.step2",
  "tutorialItems.account.step3",
  "tutorialItems.findJobs.title",
  "tutorialItems.findJobs.step1",
  "tutorialItems.findJobs.step2",
  "tutorialItems.findJobs.step3",
  "tutorialItems.findJobs.step4",
  "tutorialItems.workerProfile.title",
  "tutorialItems.workerProfile.step1",
  "tutorialItems.workerProfile.step2",
  "tutorialItems.workerProfile.step3",
  "tutorialItems.hireWorkers.title",
  "tutorialItems.hireWorkers.step1",
  "tutorialItems.hireWorkers.step2",
  "tutorialItems.hireWorkers.step3",
  "tutorialItems.postJobs.title",
  "tutorialItems.postJobs.step1",
  "tutorialItems.postJobs.step2",
  "tutorialItems.postJobs.step3",
  "tutorialItems.billing.title",
  "tutorialItems.billing.step1",
  "tutorialItems.billing.step2",
  "tutorialItems.billing.step3",
  "faqItems.whatIsAga.question",
  "faqItems.whatIsAga.answer",
  "faqItems.freeSearch.question",
  "faqItems.freeSearch.answer",
  "faqItems.plans.question",
  "faqItems.plans.answer",
  "faqItems.revealContact.question",
  "faqItems.revealContact.answer",
  "faqItems.contactShared.question",
  "faqItems.contactShared.answer",
  "faqItems.verifyEmail.question",
  "faqItems.verifyEmail.answer",
  "faqItems.language.question",
  "faqItems.language.answer",
  "faqItems.moreGuides.question",
  "faqItems.moreGuides.answer",
] as const;

const PRIVACY_TEXT = [
  "Privacy policy",
  "How AGA uses and protects your information.",
  "Who we are",
  "AGA is a UK job marketplace. We are the data controller for the personal information you provide when using this service.",
  "Information we use",
  "We process account details, profile and job information, search preferences, and contact activity to provide the marketplace, protect users, and improve the service.",
  "Your rights",
  "Under UK GDPR, you can request access, correction, deletion, restriction, or portability of your personal data, and object to certain processing. You can also complain to the ICO.",
  "Retention and sharing",
  "We keep information only as long as needed for the service and legal obligations. Contact details are shared only when a user reveals them through the marketplace.",
  "Contact",
  "For privacy requests, contact the AGA support team.",
].join(" ");

const JOB_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "apprenticeship",
] as const satisfies readonly JobType[];

function isJobType(value: string | null): value is JobType {
  return JOB_TYPES.some((type) => type === value);
}

function joinText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

function metaLine(parts: Array<string | null | undefined>) {
  const text = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  return text || null;
}

function place(address: string | null, postcode: string | null) {
  return metaLine([address, postcode]);
}

function rankTitle(title: string, query: string) {
  const value = title.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  if (value.startsWith(needle)) return 0;
  if (value.includes(needle)) return 1;
  return 2;
}

function matchPages(
  query: string,
  pages: Array<{ id: string; href: string; title: string; text: string }>
): SearchHit[] {
  const needle = query.toLocaleLowerCase();
  return pages
    .filter((page) => `${page.title} ${page.text}`.toLocaleLowerCase().includes(needle))
    .map((page) => ({
      id: page.id,
      title: page.title,
      href: page.href,
      snippet: snippet(page.text, query),
      meta: null,
    }));
}

function profileHit(
  profile: SiteProfileHit,
  query: string,
  workerLabel: string,
  employerLabel: string
): SearchHit {
  const label = profile.role === "worker" ? workerLabel : employerLabel;
  return {
    id: `${profile.role}-${profile.id}`,
    title: profile.title?.trim() || label,
    href: profile.role === "worker" ? `/workers/${profile.id}` : `/employers/${profile.id}`,
    snippet: snippet(joinText([profile.body, profile.skills]), query),
    meta: metaLine([label, place(profile.addressText, profile.postcode)]),
  };
}

export async function runSiteSearch(query: string): Promise<SiteSearchResults> {
  const localeParam = await getLocale();
  const locale: ActiveLocale = isActiveLocale(localeParam) ? localeParam : "en";
  const [tCommon, tJobs, tEducation, tMarketplace, tPricing, tHelp, tBilling, tNotifications, tAuth, tSearch] =
    await Promise.all([
      getTranslations("common"),
      getTranslations("jobs"),
      getTranslations("education"),
      getTranslations("marketplace"),
      getTranslations("pricing"),
      getTranslations("help"),
      getTranslations("billing"),
      getTranslations("notifications"),
      getTranslations("auth"),
      getTranslations("search"),
    ]);

  const helpText = HELP_KEYS.map((key) => tHelp(key)).join(" ");
  const pages = matchPages(query, [
    {
      id: "home",
      href: "/",
      title: tCommon("nav.home"),
      text: joinText([
        tCommon("tagline"),
        tCommon("description"),
        tCommon("features.findWork.title"),
        tCommon("features.findWork.body"),
        tCommon("features.hire.title"),
        tCommon("features.hire.body"),
        tCommon("features.learn.title"),
        tCommon("features.learn.body"),
        tCommon("features.marketplace.title"),
        tCommon("features.marketplace.body"),
      ]),
    },
    {
      id: "jobs",
      href: "/jobs",
      title: tCommon("nav.findWork"),
      text: joinText([
        tCommon("shortcuts.findWork"),
        tCommon("features.findWork.title"),
        tCommon("features.findWork.body"),
        tJobs("searchTitle"),
      ]),
    },
    {
      id: "workers",
      href: "/workers",
      title: tCommon("nav.hire"),
      text: joinText([
        tCommon("shortcuts.hire"),
        tCommon("features.hire.title"),
        tCommon("features.hire.body"),
      ]),
    },
    {
      id: "education",
      href: "/education",
      title: tEducation("title"),
      text: joinText([
        tEducation("subtitle"),
        tCommon("features.learn.title"),
        tCommon("features.learn.body"),
      ]),
    },
    {
      id: "education-short-videos",
      href: "/education/short-videos",
      title: tEducation("sectionShortVideos"),
      text: tEducation("sectionShortVideosHint"),
    },
    {
      id: "education-courses",
      href: "/education/courses",
      title: tEducation("sectionCourses"),
      text: tEducation("sectionCoursesHint"),
    },
    {
      id: "education-pdf",
      href: "/education/pdf",
      title: tEducation("sectionPdfGuides"),
      text: tEducation("sectionPdfGuidesHint"),
    },
    {
      id: "marketplace",
      href: "/marketplace",
      title: tMarketplace("title"),
      text: joinText([
        tMarketplace("subtitle"),
        tCommon("features.marketplace.title"),
        tCommon("features.marketplace.body"),
      ]),
    },
    {
      id: "pricing",
      href: "/pricing",
      title: tPricing("title"),
      text: tPricing("subtitle"),
    },
    {
      id: "billing",
      href: "/billing",
      title: tBilling("title"),
      text: joinText([tBilling("subtitle"), tCommon("nav.billing")]),
    },
    {
      id: "notifications",
      href: "/notifications",
      title: tNotifications("title"),
      text: tNotifications("subtitle"),
    },
    {
      id: "help",
      href: "/#help",
      title: tHelp("title"),
      text: helpText,
    },
    {
      id: "privacy",
      href: "/#privacy",
      title: tCommon("nav.privacy"),
      text: PRIVACY_TEXT,
    },
    {
      id: "sign-in",
      href: "/sign-in",
      title: tAuth("signInTitle"),
      text: tCommon("nav.signIn"),
    },
    {
      id: "sign-up",
      href: "/sign-up",
      title: tAuth("signUpTitle"),
      text: tCommon("nav.signUp"),
    },
  ]);

  const content = await searchSiteContent(query);
  if (!content) {
    return {
      pages,
      jobs: [],
      profiles: [],
      education: [],
      marketplace: [],
      unavailable: true,
    };
  }

  const mediaLabel = {
    pdf: tEducation("typePdf"),
    short_video: tEducation("typeShortVideo"),
    lecture: tEducation("typeCourse"),
  } as const;

  const profiles = [...content.profiles]
    .sort(
      (a, b) =>
        a.matchRank - b.matchRank ||
        rankTitle(a.title ?? "", query) - rankTitle(b.title ?? "", query) ||
        b.matchScore - a.matchScore
    )
    .slice(0, 12)
    .map((profile) =>
      profileHit(
        profile,
        query,
        tSearch("profileWorker"),
        tSearch("profileEmployer")
      )
    );

  return {
    pages,
    unavailable: false,
    jobs: content.jobs.map((job) => ({
      id: `job-${job.id}`,
      title: job.title,
      href: `/jobs/${job.id}`,
      snippet: snippet(
        joinText([job.description, job.requirements, job.skills]),
        query
      ),
      meta: metaLine([
        job.companyName,
        place(job.addressText, job.postcode),
        isJobType(job.jobType) ? tJobs(`jobTypes.${job.jobType}`) : null,
      ]),
    })),
    profiles,
    education: content.education.map((resource) => {
      const localized = {
        title_en: resource.titleEn,
        title_ar: resource.titleAr,
        title_ckb: resource.titleCkb,
        description_en: resource.descriptionEn,
        description_ar: resource.descriptionAr,
        description_ckb: resource.descriptionCkb,
      } as EducationResource;
      const slug = educationMediaTypeToSlug(resource.mediaType);
      return {
        id: `education-${resource.id}`,
        title: localizedEducationTitle(localized, locale),
        href: `/education/${slug}#resource-${resource.id}`,
        snippet: snippet(
          localizedEducationDescription(localized, locale) || resource.topic,
          query
        ),
        meta: metaLine([mediaLabel[resource.mediaType], resource.topic]),
      };
    }),
    marketplace: content.marketplace.map((post) => ({
      id: `marketplace-${post.id}`,
      title: post.title,
      href: `/marketplace#${post.id}`,
      snippet: snippet(post.description, query),
      meta: metaLine([
        post.category,
        post.location,
        post.price,
        post.seller ? tSearch("by", { name: post.seller }) : null,
      ]),
    })),
  };
}
