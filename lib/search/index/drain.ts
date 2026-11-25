import { activeLocales, type ActiveLocale } from "@/lib/i18n/locales";
import { embedTexts, embeddingConfigured, EMBEDDING_MODEL } from "@/lib/search/embed-client";
import {
  embeddingPassage,
  loadIndexSource,
  type IndexField,
  type IndexFieldName,
  type IndexSource,
} from "@/lib/search/index/documents";
import {
  claimNext,
  completeQueueItem,
  deferQueueItem,
  deleteFieldTranslations,
  deleteHumanTranslation,
  embeddingSourceHash,
  enqueueMissingDocuments,
  listTranslations,
  purgeSearchIndex,
  recordTranslationCharacters,
  releaseQueueItem,
  retryQueueItem,
  translationCharactersUsed,
  upsertEmbedding,
  upsertTranslation,
  type QueueItem,
  type StoredTranslation,
} from "@/lib/search/index/store";
import { sourceHash } from "@/lib/search/source-hash";
import {
  AZURE_REQUEST_CHAR_LIMIT,
  fitTranslationText,
  translateTexts,
  translationCharacters,
  translatorConfigured,
} from "@/lib/search/translate";

/** Azure Translator F0 allows 2 million characters per month and per hour. */
const MONTHLY_CHAR_BUDGET = 1_800_000;

export type DrainOptions = {
  limit: number;
  characterBudget: number;
  order: "newest" | "oldest";
};

export type DrainStats = {
  processed: number;
  translatedCharacters: number;
  embedded: number;
  deferred: number;
  failed: number;
};

type PendingTranslation = {
  fieldName: IndexFieldName;
  from: ActiveLocale;
  /** Full source text. The hash is of this, even if Azure receives a prefix. */
  text: string;
  hash: string;
  targets: ActiveLocale[];
};

type TranslationStatus = "ok" | "deferred" | "failed" | "stop";

class CharacterBudget {
  spent = 0;

  constructor(
    private readonly runLimit: number,
    private monthUsed: number
  ) {}

  reserve(cost: number): "ok" | "stop" | "defer" {
    if (this.monthUsed + cost > MONTHLY_CHAR_BUDGET) return "defer";
    if (this.spent > 0 && this.spent + cost > this.runLimit) return "stop";
    this.spent += cost;
    this.monthUsed += cost;
    return "ok";
  }

  release(cost: number) {
    this.spent = Math.max(0, this.spent - cost);
    this.monthUsed = Math.max(0, this.monthUsed - cost);
  }
}

export async function backfillSearchIndex(): Promise<number> {
  return enqueueMissingDocuments();
}

let tail: Promise<unknown> = Promise.resolve();

export function drainSearchIndex(options: DrainOptions): Promise<DrainStats> {
  const run = tail.then(() => drainBody(options));
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function drainBody(options: DrainOptions): Promise<DrainStats> {
  const stats: DrainStats = {
    processed: 0,
    translatedCharacters: 0,
    embedded: 0,
    deferred: 0,
    failed: 0,
  };
  const budget = new CharacterBudget(
    options.characterBudget,
    await translationCharactersUsed()
  );
  const limit = Math.max(1, Math.min(options.limit, 20));

  for (let count = 0; count < limit; count += 1) {
    const item = await claimNext(options.order);
    if (!item) break;
    const outcome = await processItem(item, budget);
    stats.processed += 1;
    stats.translatedCharacters = budget.spent;
    if (outcome === "embedded") stats.embedded += 1;
    if (outcome === "deferred") stats.deferred += 1;
    if (outcome === "failed") stats.failed += 1;
    if (outcome === "stop") break;
  }

  return stats;
}

type ItemOutcome = "ok" | "embedded" | "deferred" | "failed" | "stop";

async function processItem(
  item: QueueItem,
  budget: CharacterBudget
): Promise<ItemOutcome> {
  try {
    const source = await loadIndexSource(item.entityType, item.entityId);
    if (!source || !source.indexable) {
      await purgeSearchIndex(item.entityType, item.entityId);
      return "ok";
    }

    await syncHumanTranslations(source);
    const existing = await listTranslations(source.entityType, source.entityId);
    const translation = await translateMissing(source, existing, budget);
    const embedded = await embedDocument(source);

    if (translation === "stop") {
      await releaseQueueItem(item);
      return "stop";
    }
    if (translation === "deferred") {
      await deferQueueItem(item);
      return "deferred";
    }
    if (translation === "failed" || embedded === "failed") {
      await retryQueueItem(
        item,
        translation === "failed" ? "translation failed" : "embedding failed"
      );
      return "failed";
    }
    await completeQueueItem(item);
    return embedded === "ok" ? "embedded" : "ok";
  } catch (error) {
    const message = error instanceof Error ? error.message : "index failed";
    console.error(
      "[search-index]",
      item.entityType,
      item.entityId,
      message
    );
    try {
      await retryQueueItem(item, message);
    } catch (retryError) {
      console.error("[search-index] retry update failed", retryError);
    }
    return "failed";
  }
}

async function syncHumanTranslations(source: IndexSource): Promise<void> {
  const keep = new Set(source.fields.map((field) => field.fieldName));
  for (const fieldName of ["title", "description"] as const) {
    if (!keep.has(fieldName)) {
      await deleteFieldTranslations(source.entityType, source.entityId, fieldName);
    }
  }

  for (const field of source.fields) {
    for (const locale of activeLocales) {
      const text = field.human[locale];
      if (!text) {
        await deleteHumanTranslation(
          source.entityType,
          source.entityId,
          field.fieldName,
          locale
        );
        continue;
      }
      await upsertTranslation({
        entityType: source.entityType,
        entityId: source.entityId,
        fieldName: field.fieldName,
        locale,
        sourceLocale: locale,
        origin: "human",
        sourceHash: sourceHash(text),
        text,
      });
    }
  }
}

function pendingTranslations(
  source: IndexSource,
  existing: StoredTranslation[]
): PendingTranslation[] {
  const pending: PendingTranslation[] = [];
  for (const field of source.fields) {
    const from = sourceLocale(field);
    if (!from) continue;
    const text = field.human[from];
    if (!text) continue;
    const hash = sourceHash(text);
    const targets = activeLocales.filter((locale) => {
      if (field.human[locale]) return false;
      const row = existing.find(
        (item) => item.fieldName === field.fieldName && item.locale === locale
      );
      if (!row) return true;
      if (row.origin === "human") return false;
      return row.sourceHash !== hash;
    });
    if (targets.length > 0) {
      pending.push({ fieldName: field.fieldName, from, text, hash, targets });
    }
  }
  return pending;
}

function sourceLocale(field: IndexField): ActiveLocale | null {
  for (const locale of activeLocales) {
    if (field.human[locale]) return locale;
  }
  return null;
}

async function translateMissing(
  source: IndexSource,
  existing: StoredTranslation[],
  budget: CharacterBudget
): Promise<TranslationStatus> {
  const pending = pendingTranslations(source, existing);
  if (pending.length === 0 || !translatorConfigured()) return "ok";

  const groups = new Map<string, { from: ActiveLocale; targets: ActiveLocale[]; items: PendingTranslation[] }>();
  for (const item of pending) {
    const key = `${item.from}|${[...item.targets].sort().join(",")}`;
    const group = groups.get(key) ?? { from: item.from, targets: item.targets, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }

  let deferred = false;
  for (const group of groups.values()) {
    let index = 0;
    while (index < group.items.length) {
      const chunk: PendingTranslation[] = [];
      const payloads: string[] = [];
      let cost = 0;
      while (index < group.items.length) {
        const item = group.items[index]!;
        const payload = fitTranslationText(item.text, group.targets.length);
        const next = translationCharacters([payload], group.targets.length);
        if (chunk.length > 0 && cost + next > AZURE_REQUEST_CHAR_LIMIT) break;
        chunk.push(item);
        payloads.push(payload);
        cost += next;
        index += 1;
      }

      const decision = budget.reserve(cost);
      if (decision === "stop") return "stop";
      if (decision === "defer") {
        deferred = true;
        continue;
      }

      try {
        const translated = await translateTexts(payloads, group.from, group.targets);
        for (let itemIndex = 0; itemIndex < chunk.length; itemIndex += 1) {
          const item = chunk[itemIndex]!;
          const result = translated[itemIndex] ?? {};
          for (const locale of group.targets) {
            const text = result[locale];
            if (!text) {
              throw new Error(`Azure Translator omitted ${locale}`);
            }
            await upsertTranslation({
              entityType: source.entityType,
              entityId: source.entityId,
              fieldName: item.fieldName,
              locale,
              sourceLocale: item.from,
              origin: "machine",
              sourceHash: item.hash,
              text,
            });
          }
        }
        await recordTranslationCharacters(cost);
      } catch (error) {
        budget.release(cost);
        console.error(
          "[search-index] translation failed",
          source.entityType,
          source.entityId,
          error
        );
        return "failed";
      }
    }
  }

  return deferred ? "deferred" : "ok";
}

async function embedDocument(
  source: IndexSource
): Promise<"ok" | "skipped" | "failed"> {
  if (!embeddingConfigured()) return "skipped";
  const rows = await listTranslations(source.entityType, source.entityId);
  const passage = embeddingPassage(
    source.passage,
    rows.map((row) => row.text)
  );
  const hash = sourceHash(`${EMBEDDING_MODEL}\n${passage}`);
  const current = await embeddingSourceHash(source.entityType, source.entityId);
  if (!passage) {
    if (current !== hash) {
      await upsertEmbedding({
        entityType: source.entityType,
        entityId: source.entityId,
        sourceHash: hash,
        vectorJson: "[0]",
      });
    }
    return "skipped";
  }
  if (current === hash) return "skipped";
  const vectors = await embedTexts([passage], "passage", 30_000);
  const vector = vectors?.[0];
  if (!vector) return "failed";
  await upsertEmbedding({
    entityType: source.entityType,
    entityId: source.entityId,
    sourceHash: hash,
    vectorJson: JSON.stringify(vector),
  });
  return "ok";
}
