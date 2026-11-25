export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function vectorFromJson(value: unknown): number[] | null {
  const parsed = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  const vector: number[] = [];
  for (const item of parsed) {
    const number = typeof item === "number" ? item : Number(item);
    if (!Number.isFinite(number)) return null;
    vector.push(number);
  }
  return vector;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
