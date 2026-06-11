"use client";

import { useState } from "react";
import { Recipe, scaleIngredient, defaultScale } from "@/app/lib/recipes";

type CookedStatus = "cooked" | "skipped" | "none";

type Props = {
  recipe: Recipe;
  position: number;
  weekKey: string;
  initialStatus: CookedStatus;
  userScale: number;
  onShuffle: (position: number, newRecipeId: string) => void;
};

export default function MealCard({ recipe, position, weekKey, initialStatus, userScale, onShuffle }: Props) {
  const [status, setStatus] = useState<CookedStatus>(initialStatus);
  const [shuffling, setShuffling] = useState(false);

  // Combine the default recipe scale (to hit 6 servings) with the user's manual multiplier
  const recipeScale = defaultScale(recipe);   // e.g. 1.5 for blogspot (4-serving) recipes
  const totalScale = recipeScale * userScale;

  async function handleShuffle() {
    setShuffling(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: weekKey, position, source: recipe.source }),
      });
      if (!res.ok) throw new Error("shuffle failed");
      const data = await res.json();
      onShuffle(position, data.plan.recipeIds[position]);
    } catch {
      alert("Couldn't shuffle right now — try again.");
    } finally {
      setShuffling(false);
    }
  }

  async function handleStatus(next: CookedStatus) {
    const newStatus = status === next ? "none" : next;
    setStatus(newStatus);
    await fetch("/api/cooked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: weekKey, recipeId: recipe.id, status: newStatus }),
    });
  }

  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const isMuted = status === "cooked" || status === "skipped";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm flex flex-col gap-3 transition-opacity ${
        isMuted ? "opacity-50" : "opacity-100"
      } ${status === "cooked" ? "bg-emerald-50 border-emerald-200" : status === "skipped" ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
            {dayLabels[position]}
          </p>
          <h2 className={`text-lg font-bold text-gray-800 leading-snug ${isMuted ? "line-through" : ""}`}>
            {recipe.title}
          </h2>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
            recipe.source === "blogspot"
              ? "bg-amber-100 text-amber-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {recipe.source === "blogspot" ? "Let Me Plan Dinner" : "Allrecipes"}
        </span>
      </div>

      {/* Ingredient list */}
      <ul className="text-sm text-gray-700 space-y-0.5 list-disc list-inside">
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>{scaleIngredient(ing, totalScale)}</li>
        ))}
      </ul>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:underline"
        >
          View Full Recipe →
        </a>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => handleStatus("cooked")}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              status === "cooked"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-emerald-500"
            }`}
          >
            ✓ Cooked
          </button>
          <button
            onClick={() => handleStatus("skipped")}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              status === "skipped"
                ? "bg-gray-500 text-white border-gray-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            Skip
          </button>
          <button
            onClick={handleShuffle}
            disabled={shuffling}
            className="text-xs px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-emerald-500 font-medium transition-colors disabled:opacity-40"
          >
            {shuffling ? "..." : "⟳ Shuffle"}
          </button>
        </div>
      </div>
    </div>
  );
}
