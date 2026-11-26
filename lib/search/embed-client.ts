export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";

export function embeddingConfigured(): boolean {
  return Boolean(process.env.EMBEDDING_URL?.trim());
}

function asVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const vector: number[] = [];
  for (const item of value) {
    const number = typeof item === "number" ? item : Number(item);
    if (!Number.isFinite(number)) return null;
    vector.push(number);
  }
  return vector;
}

/** Null when the service is unset or unreachable. Search keeps lexical hits. */
export async function embedTexts(
  texts: string[],
  kind: "query" | "passage",
  timeoutMs = 8000
): Promise<number[][] | null> {
  const base = process.env.EMBEDDING_URL?.trim();
  if (!base || texts.length === 0) return null;
  try {
    const response = await fetch(new URL("/embed", base.endsWith("/") ? base : `${base}/`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts, kind }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      model?: string;
      vectors?: unknown;
    };
    if (payload.model !== EMBEDDING_MODEL || !Array.isArray(payload.vectors)) {
      return null;
    }
    const vectors = payload.vectors.map((item) => asVector(item));
    if (vectors.some((vector) => !vector)) return null;
    return vectors as number[][];
  } catch (error) {
    console.error("[search] embedding request failed", error);
    return null;
  }
}
