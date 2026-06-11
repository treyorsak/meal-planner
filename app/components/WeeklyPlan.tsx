"use client";

import { useCallback, useEffect, useState } from "react";
import { Recipe } from "@/app/lib/recipes";
import MealCard from "./MealCard";
import ServingScaler from "./ServingScaler";

type CookedMap = Record<string, "cooked" | "skipped">;

type Props = {
  initialRecipes: Recipe[];
  weekKey: string;
  weekLabel: string;
  initialCooked: CookedMap;
};

export default function WeeklyPlan({ initialRecipes, weekKey, weekLabel, initialCooked }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [userScale, setUserScale] = useState(1.0);

  // When a meal is shuffled the API returns the new recipe ID — we need
  // to fetch updated recipe data. For simplicity we reload the page.
  function handleShuffle(_position: number, _newId: string) {
    window.location.reload();
  }

  const handleScaleChange = useCallback((scale: number) => {
    setUserScale(scale);
  }, []);

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
          🛒 Shopping List
        </a>
      </div>

      <ServingScaler onChange={handleScaleChange} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {recipes.map((recipe, i) => (
          <MealCard
            key={recipe.id}
            recipe={recipe}
            position={i}
            weekKey={weekKey}
            initialStatus={(initialCooked[recipe.id] as "cooked" | "skipped" | "none") ?? "none"}
            userScale={userScale}
            onShuffle={handleShuffle}
          />
        ))}
      </div>

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
