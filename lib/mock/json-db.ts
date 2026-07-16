import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

type MemoryStore = Map<string, string>;

function getMemoryStore(): MemoryStore {
  const g = globalThis as typeof globalThis & {
    __agaMockJson?: MemoryStore;
  };
  if (!g.__agaMockJson) g.__agaMockJson = new Map();
  return g.__agaMockJson;
}

/** True on Netlify/Lambda or when USE_MEMORY_MOCK_JSON=1. */
export function isMemoryMockJson(): boolean {
  const flag =
    process.env.USE_MEMORY_MOCK_JSON ?? process.env.NEXT_PUBLIC_USE_MEMORY_MOCK_JSON;
  if (flag === "1" || flag === "true") return true;
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
  );
}

let fsWritable: boolean | null = null;

function canUseFs(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const probe = path.join(DATA_DIR, ".write-probe");
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function shouldUseMemory(): boolean {
  if (isMemoryMockJson()) return true;
  if (fsWritable === null) fsWritable = canUseFs();
  return !fsWritable;
}

export function readJsonFile<T>(filename: string, fallback: T): T {
  if (shouldUseMemory()) {
    const store = getMemoryStore();
    const raw = store.get(filename);
    if (!raw) {
      const cloned = structuredClone(fallback);
      store.set(filename, `${JSON.stringify(cloned, null, 2)}\n`);
      return structuredClone(cloned);
    }
    return JSON.parse(raw) as T;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filename, fallback);
    return structuredClone(fallback);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function writeJsonFile<T>(filename: string, data: T): void {
  if (shouldUseMemory()) {
    getMemoryStore().set(filename, `${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function nextNumericId(
  items: { id: number }[],
  minId: number
): number {
  const max = items.reduce((acc, item) => Math.max(acc, item.id), minId - 1);
  return max + 1;
}
