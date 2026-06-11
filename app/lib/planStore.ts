/**
 * Thin wrapper around Vercel KV for weekly plan and cooked state.
 * Falls back to an in-memory store during local dev when KV env vars are absent.
 */

export type WeekPlan = {
  recipeIds: string[];          // 5 recipe IDs [blogspot×3, allrecipes×2]
  cooked: Record<string, "cooked" | "skipped">;
};

// In-memory fallback for local dev (resets on server restart)
const memStore: Record<string, WeekPlan> = {};

async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  const { kv } = await import("@vercel/kv");
  return kv;
}

export async function getPlan(weekKey: string): Promise<WeekPlan | null> {
  const kv = await getKV();
  if (kv) {
    return (await kv.get<WeekPlan>(`plan:${weekKey}`)) ?? null;
  }
  return memStore[weekKey] ?? null;
}

export async function setPlan(weekKey: string, plan: WeekPlan): Promise<void> {
  const kv = await getKV();
  if (kv) {
    // Keep weekly plans for 90 days
    await kv.set(`plan:${weekKey}`, plan, { ex: 90 * 24 * 60 * 60 });
  } else {
    memStore[weekKey] = plan;
  }
}
