"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Recipe } from "@/app/lib/recipes";
import MealCard from "./MealCard";
import ServingScaler from "./ServingScaler";

type CookedMap = Record<string, "cooked" | "skipped">;

type Props = {
  weekKey: string;
  weekLabel: string;
};

function cacheKey(weekKey: string) {
  return `mealplan-${weekKey}`;
}

function saveCache(weekKey: string, recipes: Recipe[], cooked: CookedMap) {
  try {
    sessionStorage.setItem(cacheKey(weekKey), JSON.stringify({ recipes, cooked }));
  } catch {}
}

export default function WeeklyPlan({ weekKey, weekLabel }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cooked, setCooked] = useState<CookedMap>({});
  const [loading, setLoading] = useState(true);
  const [userScale, setUserScale] = useState(1.0);
  // ref so callbacks always see the latest value without stale closure
  const cookedRef = useRef<CookedMap>({});
  const recipesRef = useRef<Recipe[]>([]);

  useEffect(() => {
    cookedRef.current = cooked;
  }, [cooked]);

  useEffect(() => {
    recipesRef.current = recipes;
  }, [recipes]);

  useEffect(() => {
    // Restore from sessionStorage if available (persists across page navigations)
    try {
      const cached = sessionStorage.getItem(cacheKey(weekKey));
      if (cached) {
        const { recipes: r, cooked: c } = JSON.parse(cached) as { recipes: Recipe[]; cooked: CookedMap };
        setRecipes(r);
        setCooked(c ?? {});
        setLoading(false);
        return;
      }
    } catch {}

    // First load: fetch from API
    fetch(`/api/plan?week=${weekKey}`)
      .then((r) => r.json())
      .then(async (data) => {
        const ids: string[] = data.plan?.recipeIds ?? [];
        const cookedMap: CookedMap = data.plan?.cooked ?? {};

        const fetched = await Promise.all(
          ids.map((id) =>
            fetch(`/api/recipe/${id}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          )
        );
        const valid = fetched.filter(Boolean) as Recipe[];

        setRecipes(valid);
        setCooked(cookedMap);
        saveCache(weekKey, valid, cookedMap);
      })
      .finally(() => setLoading(false));
  }, [weekKey]);

  async function handleShuffle(position: number, source: "blogspot" | "allrecipes") {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekKey, position, source }),
    });
    if (!res.ok) throw new Error("shuffle failed");
    const data = await res.json();
    const newId: string = data.plan.recipeIds[position];

    const newRecipe: Recipe = await fetch(`/api/recipe/${newId}`).then((r) => r.json());

    setRecipes((prev) => {
      const updated = [...prev];
      updated[position] = newRecipe;
      saveCache(weekKey, updated, cookedRef.current);
      return updated;
    });
  }

  async function handleBan(recipeId: string, position: number, source: "blogspot" | "allrecipes") {
    const res = await fetch("/api/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, week: weekKey, position, source }),
    });
    if (!res.ok) throw new Error("ban failed");
    const data = await res.json();
    const newRecipe: Recipe = data.recipe;

    setRecipes((prev) => {
      const updated = [...prev];
      updated[position] = newRecipe;
      saveCache(weekKey, updated, cookedRef.current);
      return updated;
    });
  }

  function handleStatusChange(recipeId: string, status: "cooked" | "skipped" | "none") {
    // Call the cooked API
    fetch("/api/cooked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekKey, recipeId, status }),
    });

    setCooked((prev) => {
      const updated = { ...prev };
      if (status === "none") delete updated[recipeId];
      else updated[recipeId] = status;
      saveCache(weekKey, recipesRef.current, updated);
      return updated;
    });
  }

  const handleScaleChange = useCallback((scale: number) => setUserScale(scale), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-800">
          Week of <span className="text-emerald-600">{weekLabel}</span>
        </h1>
        <a
          href="/shopping-list"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-full transition-colors shadow"
        >
          Shopping List
        </a>
      </div>

      <ServingScaler onChange={handleScaleChange} />

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading this week&apos;s meals...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe, i) => (
            <MealCard
              key={recipe.id}
              recipe={recipe}
              position={i}
              status={cooked[recipe.id] ?? "none"}
              userScale={userScale}
              onShuffle={() => handleShuffle(i, recipe.source)}
              onBan={() => handleBan(recipe.id, i, recipe.source)}
              onStatusChange={(s) => handleStatusChange(recipe.id, s)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Recipes 1–3 from{" "}
        <a href="https://letmeplandinner.blogspot.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Let Me Plan Dinner
        </a>{" "}
        · Recipes 4–5 from{" "}
        <a href="https://www.allrecipes.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Allrecipes
        </a>
      </p>
    </div>
  );
}
