import { NextRequest, NextResponse } from "next/server";
import { getPlan, setPlan, getBanned, banRecipe } from "@/app/lib/planStore";
import { getBlogspotRecipes, getAllrecipesRecipes } from "@/app/lib/recipeLoader";
import { getISOWeekKey } from "@/app/lib/week";

export async function POST(req: NextRequest) {
  const { recipeId, week, position, source, currentRecipeIds } = await req.json() as {
    recipeId: string;
    week: string;
    position: number;
    source: "blogspot" | "allrecipes";
    currentRecipeIds: string[];
  };

  const weekKey = week ?? getISOWeekKey();

  // Ban the recipe first, then find a replacement that isn't banned
  await banRecipe(recipeId);
  const banned = new Set(await getBanned());

  // Use stored plan if available; fall back to what the client reported
  const plan = (await getPlan(weekKey)) ?? { recipeIds: currentRecipeIds, cooked: {} };

  const currentIds = new Set(plan.recipeIds);
  const pool = source === "blogspot" ? getBlogspotRecipes() : getAllrecipesRecipes();
  const candidates = pool.filter((r) => !currentIds.has(r.id) && !banned.has(r.id));

  if (candidates.length === 0) {
    return NextResponse.json({ error: "No replacement available" }, { status: 400 });
  }

  const replacement = candidates[Math.floor(Math.random() * candidates.length)];
  const newIds = [...plan.recipeIds];
  newIds[position] = replacement.id;
  await setPlan(weekKey, { ...plan, recipeIds: newIds });

  return NextResponse.json({ recipe: replacement });
}
