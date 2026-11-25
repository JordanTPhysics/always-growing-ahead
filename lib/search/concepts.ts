import { searchTokens } from "@/lib/search/text";

const MAX_EXPANSION = 16;

type ConceptLabels = {
  en: readonly string[];
  ar: readonly string[];
  ckb: readonly string[];
};

/**
 * Marketplace words people search for, in the three active locales.
 * English labels cover the map occupations and the skills seeded in
 * `001_initial_schema.sql`. Authors are not asked to translate listings.
 */
const SEARCH_CONCEPTS: readonly ConceptLabels[] = [
  {
    en: ["hair", "barber", "salon", "hairdresser", "haircut"],
    ar: ["حلاق", "شعر", "صالون", "حلاقة"],
    ckb: ["سەرتاش", "قژ", "سالۆن"],
  },
  {
    en: ["mechanic"],
    ar: ["ميكانيكي"],
    ckb: ["میکانیک"],
  },
  {
    en: ["restaurant"],
    ar: ["مطعم"],
    ckb: ["چێشتخانە"],
  },
  {
    en: ["supermarket"],
    ar: ["سوبرماركت"],
    ckb: ["سوپەرمارکێت"],
  },
  {
    en: ["car wash", "carwash"],
    ar: ["غسيل سيارات"],
    ckb: ["شوشتنی ئۆتۆمبێل"],
  },
  {
    en: ["tyre", "tire"],
    ar: ["إطارات"],
    ckb: ["تایە"],
  },
  {
    en: ["customer service"],
    ar: ["خدمة العملاء"],
    ckb: ["خزمەتگوزاری کڕیار"],
  },
  {
    en: ["forklift"],
    ar: ["رافعة شوكية"],
    ckb: ["فۆرکلیفت"],
  },
  {
    en: ["hgv licence", "hgv license"],
    ar: ["رخصة شاحنات"],
    ckb: ["مۆڵەتی لۆری"],
  },
  {
    en: ["cscs card", "cscs"],
    ar: ["بطاقة CSCS"],
    ckb: ["کارتی CSCS"],
  },
  {
    en: ["food hygiene"],
    ar: ["سلامة الغذاء"],
    ckb: ["پاکوخاوێنی خۆراک"],
  },
  {
    en: ["microsoft office"],
    ar: ["مايكروسوفت أوفيس"],
    ckb: ["مایکرۆسۆفت ئۆفیس"],
  },
  {
    en: ["cash handling"],
    ar: ["التعامل مع النقد"],
    ckb: ["مامەڵە بە پارە"],
  },
  {
    en: ["first aid"],
    ar: ["إسعافات أولية"],
    ckb: ["فریاگوزاری سەرەتایی"],
  },
  {
    en: ["arabic"],
    ar: ["العربية"],
    ckb: ["عەرەبی"],
  },
  {
    en: ["kurdish"],
    ar: ["الكردية"],
    ckb: ["کوردی"],
  },
  {
    en: ["english"],
    ar: ["الإنجليزية"],
    ckb: ["ئینگلیزی"],
  },
  {
    en: ["cleaning"],
    ar: ["تنظيف"],
    ckb: ["پاککردنەوە"],
  },
  {
    en: ["security sia", "sia"],
    ar: ["أمن"],
    ckb: ["ئاسایش"],
  },
  {
    en: ["care certificate"],
    ar: ["شهادة رعاية"],
    ckb: ["بڕوانامەی چاودێری"],
  },
  {
    en: ["plumbing"],
    ar: ["سباكة"],
    ckb: ["بۆریکاری"],
  },
  {
    en: ["electrical"],
    ar: ["كهرباء"],
    ckb: ["کارەبا"],
  },
  {
    en: ["welding"],
    ar: ["لحام"],
    ckb: ["جوشکاری"],
  },
  {
    en: ["warehouse picking"],
    ar: ["تجهيز المستودعات"],
    ckb: ["هەڵبژاردنی کۆگا"],
  },
  {
    en: ["reception"],
    ar: ["استقبال"],
    ckb: ["پێشوازی"],
  },
  {
    en: ["sales"],
    ar: ["مبيعات"],
    ckb: ["فرۆشتن"],
  },
];

function phraseKey(text: string): string {
  return searchTokens(text).join(" ");
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/** Whole tokens or phrases. "chair" does not match the label "hair". */
export function labelMatchesQuery(label: string, query: string): boolean {
  const labelTokens = searchTokens(label);
  const queryTokens = searchTokens(query);
  if (labelTokens.length === 0 || queryTokens.length === 0) return false;
  return (
    containsSequence(queryTokens, labelTokens) ||
    containsSequence(labelTokens, queryTokens)
  );
}

function interleaved(labels: ConceptLabels): string[] {
  const lists = [labels.en, labels.ar, labels.ckb];
  const longest = Math.max(...lists.map((list) => list.length));
  const out: string[] = [];
  for (let index = 0; index < longest; index += 1) {
    for (const list of lists) {
      const label = list[index];
      if (label) out.push(label);
    }
  }
  return out;
}

/**
 * Labels to run through LIKE in addition to the typed query.
 * The typed query is not included; callers rank it first.
 */
export function expandSearchQuery(query: string): string[] {
  const queryKey = phraseKey(query);
  if (!queryKey) return [];
  const seen = new Set<string>();
  const extra: string[] = [];

  for (const concept of SEARCH_CONCEPTS) {
    const labels = interleaved(concept);
    if (!labels.some((label) => labelMatchesQuery(label, query))) continue;
    for (const label of labels) {
      const key = phraseKey(label);
      if (!key || key === queryKey || seen.has(key)) continue;
      seen.add(key);
      extra.push(label);
      if (extra.length >= MAX_EXPANSION) return extra;
    }
  }

  return extra;
}
