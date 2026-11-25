import { drainSearchIndex } from "@/lib/search/index/drain";
import { enqueueSearchRow, purgeSearchIndex } from "@/lib/search/index/store";
import type { SearchEntityType } from "@/lib/search/index/types";

const INLINE_COOLDOWN_MS = 60_000;

const state = globalThis as typeof globalThis & {
  __agaSearchDrain?: { timer: ReturnType<typeof setTimeout> | null; lastRun: number };
};

function drainClock() {
  if (!state.__agaSearchDrain) {
    state.__agaSearchDrain = { timer: null, lastRun: 0 };
  }
  return state.__agaSearchDrain;
}

/**
 * Translate and embed soon after a save, without waiting on Azure.
 * Further saves in the same minute stay queued for the cron drain.
 */
export function scheduleSearchIndexDrain() {
  const clock = drainClock();
  if (clock.timer) return;
  const wait = Math.max(0, INLINE_COOLDOWN_MS - (Date.now() - clock.lastRun));
  const timer = setTimeout(() => {
    clock.timer = null;
    clock.lastRun = Date.now();
    void drainSearchIndex({
      limit: 1,
      characterBudget: 20_000,
      order: "newest",
    }).catch((error) => {
      console.error("[search-index] inline drain failed", error);
    });
  }, wait);
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    timer.unref();
  }
  clock.timer = timer;
}

export async function enqueueSearchIndex(
  entityType: SearchEntityType,
  entityId: number
): Promise<void> {
  try {
    await enqueueSearchRow(entityType, entityId);
    scheduleSearchIndexDrain();
  } catch (error) {
    console.error("[search-index] enqueue failed", entityType, entityId, error);
  }
}

export async function discardSearchIndex(
  entityType: SearchEntityType,
  entityId: number
): Promise<void> {
  try {
    await purgeSearchIndex(entityType, entityId);
  } catch (error) {
    console.error("[search-index] discard failed", entityType, entityId, error);
  }
}
