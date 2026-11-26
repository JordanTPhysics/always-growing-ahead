import type { ActiveLocale } from "@/lib/i18n/locales";
import { azureLanguageCode, localeFromAzure } from "@/lib/search/language";

const ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate";
const API_VERSION = "3.0";

/** Azure counts each character once per target language. */
export const AZURE_REQUEST_CHAR_LIMIT = 50_000;

export function translatorConfigured(): boolean {
  return Boolean(process.env.AZURE_TRANSLATOR_KEY?.trim());
}

export function translationCharacters(texts: string[], targetCount: number): number {
  const source = texts.reduce((sum, text) => sum + text.length, 0);
  return source * targetCount;
}

export function fitTranslationText(text: string, targetCount: number): string {
  const max = Math.floor(AZURE_REQUEST_CHAR_LIMIT / Math.max(targetCount, 1));
  return text.length <= max ? text : text.slice(0, max);
}

type AzurePayload = Array<{
  translations?: Array<{ text?: string; to?: string }>;
}>;

/**
 * Translate each text into `to`. Sends Central Kurdish as Azure `ku`.
 * Throws when the key is missing or Azure returns an error.
 */
export async function translateTexts(
  texts: string[],
  from: ActiveLocale,
  to: readonly ActiveLocale[]
): Promise<Array<Partial<Record<ActiveLocale, string>>>> {
  const key = process.env.AZURE_TRANSLATOR_KEY?.trim();
  if (!key) throw new Error("Azure Translator is not configured");
  const targets = to.filter((locale) => locale !== from);
  if (texts.length === 0 || targets.length === 0) {
    return texts.map(() => ({}));
  }

  const billed = translationCharacters(texts, targets.length);
  if (billed > AZURE_REQUEST_CHAR_LIMIT) {
    throw new Error("Azure Translator request exceeds 50000 characters");
  }

  const params = new URLSearchParams({
    "api-version": API_VERSION,
    from: azureLanguageCode(from),
  });
  for (const locale of targets) params.append("to", azureLanguageCode(locale));

  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": key,
    "Content-Type": "application/json; charset=UTF-8",
  };
  const region = process.env.AZURE_TRANSLATOR_REGION?.trim();
  if (region) headers["Ocp-Apim-Subscription-Region"] = region;

  const response = await fetch(`${ENDPOINT}?${params}`, {
    method: "POST",
    headers,
    body: JSON.stringify(texts.map((text) => ({ text }))),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Azure Translator ${response.status}: ${detail.slice(0, 300)}`
    );
  }

  const payload = (await response.json()) as AzurePayload;
  return texts.map((_, index) => {
    const translated: Partial<Record<ActiveLocale, string>> = {};
    for (const item of payload[index]?.translations ?? []) {
      const locale = item.to ? localeFromAzure(item.to) : null;
      const text = item.text?.trim();
      if (!locale || !text || !targets.includes(locale)) continue;
      translated[locale] = text;
    }
    return translated;
  });
}
