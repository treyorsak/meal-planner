import { getISOWeekKey, formatWeekRange } from "@/app/lib/week";
import { getPlan, setPlan, WeekPlan } from "@/app/lib/planStore";
import { getBlogspotRecipes, getAllrecipesRecipes, getRecipeById } from "@/app/lib/recipeLoader";
import WeeklyPlan from "@/app/components/WeeklyPlan";
import type { Recipe } from "@/app/lib/recipes";

export const dynamic = "force-dynamic";

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

async function getOrCreatePlan(weekKey: string): Promise<WeekPlan> {
  const existing = await getPlan(weekKey);
  if (existing) return existing;

  const blogspot = getBlogspotRecipes();
  const allrecipes = getAllrecipesRecipes();

  const recipeIds = [
    ...pickRandom(blogspot, 3).map((r) => r.id),
    ...pickRandom(allrecipes, 2).map((r) => r.id),
  ];

  // Pad with blogspot recipes if allrecipes data isn't available yet
  if (recipeIds.length < 5) {
    const extra = pickRandom(blogspot.filter((r) => !recipeIds.includes(r.id)), 5 - recipeIds.length);
    recipeIds.push(...extra.map((r) => r.id));
  }

  const plan: WeekPlan = { recipeIds, cooked: {} };
  await setPlan(weekKey, plan);
  return plan;
}

export default async function Home() {
  const weekKey = getISOWeekKey();
  const weekLabel = formatWeekRange(weekKey);
  const plan = await getOrCreatePlan(weekKey);

  const recipes = plan.recipeIds
    .map((id) => getRecipeById(id))
    .filter((r): r is Recipe => r !== undefined);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <WeeklyPlan
          initialRecipes={recipes}
          weekKey={weekKey}
          weekLabel={weekLabel}
          initialCooked={plan.cooked}
        />
      </div>
    </main>
  );
}
