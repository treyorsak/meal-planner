"use client";

import { useEffect, useState, useCallback } from "react";
import { getISOWeekKey, formatWeekRange } from "@/app/lib/week";
import type { Recipe } from "@/app/lib/recipes";
import ShoppingList from "@/app/components/ShoppingList";
import ServingScaler from "@/app/components/ServingScaler";

export default function ShoppingListPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userScale, setUserScale] = useState(1.0);

  const weekKey = getISOWeekKey();
  const weekLabel = formatWeekRange(weekKey);

  useEffect(() => {
    fetch(`/api/plan?week=${weekKey}`)
      .then((r) => r.json())
      .then(async (data) => {
        const ids: string[] = data.plan?.recipeIds ?? [];
        const fetched = await Promise.all(
          ids.map((id) => fetch(`/api/recipe/${id}`).then((r) => r.json()).catch(() => null))
        );
        setRecipes(fetched.filter(Boolean) as Recipe[]);
      })
      .finally(() => setLoading(false));
  }, [weekKey]);

  const handleScaleChange = useCallback((s: number) => setUserScale(s), []);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div>
            <a href="/" className="text-sm text-emerald-600 hover:underline">← Back to meal plan</a>
            <h1 className="text-2xl font-extrabold text-gray-800 mt-1">
              Shopping List — <span className="text-emerald-600">{weekLabel}</span>
            </h1>
          </div>
          <button
            onClick={() => window.print()}
            className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-full shadow"
          >
            Print
          </button>
        </div>

        <div className="mb-4 print:hidden">
          <ServingScaler onChange={handleScaleChange} />
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading ingredients...</p>
        ) : recipes.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No recipes found for this week.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <ShoppingList recipes={recipes} userScale={userScale} />
          </div>
        )}
      </div>
    </main>
  );
}
