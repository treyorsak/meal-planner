import { NextRequest, NextResponse } from "next/server";
import { getPlan, setPlan, getBanned, WeekPlan } from "@/app/lib/planStore";
import { getBlogspotRecipes, getAllrecipesRecipes } from "@/app/lib/recipeLoader";
import { getISOWeekKey } from "@/app/lib/week";

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function getOrCreatePlan(weekKey: string): Promise<WeekPlan> {
  const existing = await getPlan(weekKey);
  if (existing) return existing;

  const banned = new Set(await getBanned());
  const blogspot = getBlogspotRecipes().filter((r) => !banned.has(r.id));
  const allrecipes = getAllrecipesRecipes().filter((r) => !banned.has(r.id));

  const picked = [
    ...pickRandom(blogspot, 3).map((r) => r.id),
    ...pickRandom(allrecipes, 2).map((r) => r.id),
  ];

  const plan: WeekPlan = { recipeIds: picked, cooked: {} };
  await setPlan(weekKey, plan);
  return plan;
}

export async function GET(req: NextRequest) {
  const weekKey = req.nextUrl.searchParams.get("week") ?? getISOWeekKey();
  const plan = await getOrCreatePlan(weekKey);
  return NextResponse.json({ weekKey, plan });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { week, position, source } = body as {
    week: string;
    position: number;       // 0-4
    source: "blogspot" | "allrecipes";
  };

  const plan = await getOrCreatePlan(week);
  const banned = new Set(await getBanned());
  const pool = source === "blogspot" ? getBlogspotRecipes() : getAllrecipesRecipes();
  const currentIds = new Set(plan.recipeIds);
  const candidates = pool.filter((r) => !currentIds.has(r.id) && !banned.has(r.id));

  if (candidates.length === 0) {
    return NextResponse.json({ error: "No more recipes to shuffle" }, { status: 400 });
  }

  const replacement = candidates[Math.floor(Math.random() * candidates.length)];
  const newIds = [...plan.recipeIds];
  newIds[position] = replacement.id;
  const newPlan: WeekPlan = { ...plan, recipeIds: newIds };
  await setPlan(week, newPlan);

  return NextResponse.json({ weekKey: week, plan: newPlan });
}
