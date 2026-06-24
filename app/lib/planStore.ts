export type WeekPlan = {
  recipeIds: string[];
  cooked: Record<string, "cooked" | "skipped">;
};

// In-memory fallback when Redis env vars are absent (local dev)
const memStore: Record<string, WeekPlan> = {};
const memBanned = new Set<string>();

async function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis({ url, token });
}

export async function getPlan(weekKey: string): Promise<WeekPlan | null> {
  const redis = await getRedis();
  if (redis) {
    return (await redis.get<WeekPlan>(`plan:${weekKey}`)) ?? null;
  }
  return memStore[weekKey] ?? null;
}

export async function setPlan(weekKey: string, plan: WeekPlan): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.set(`plan:${weekKey}`, plan, { ex: 90 * 24 * 60 * 60 });
  } else {
    memStore[weekKey] = plan;
  }
}

export async function getBanned(): Promise<string[]> {
  const redis = await getRedis();
  if (redis) {
    return (await redis.get<string[]>("banned")) ?? [];
  }
  return Array.from(memBanned);
}

export async function banRecipe(id: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    const current = (await redis.get<string[]>("banned")) ?? [];
    if (!current.includes(id)) {
      await redis.set("banned", [...current, id]);
    }
  } else {
    memBanned.add(id);
  }
}
