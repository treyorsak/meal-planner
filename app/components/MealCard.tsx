"use client";

import { useState } from "react";
import { Recipe, scaleIngredient, defaultScale } from "@/app/lib/recipes";

type CookedStatus = "cooked" | "skipped" | "none";

type Props = {
  recipe: Recipe;
  position: number;
  status: CookedStatus;
  userScale: number;
  onShuffle: () => Promise<void>;
  onBan: () => Promise<void>;
  onStatusChange: (status: CookedStatus) => void;
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function MealCard({ recipe, position, status, userScale, onShuffle, onBan, onStatusChange }: Props) {
  const [busy, setBusy] = useState<"shuffle" | "ban" | null>(null);

  const totalScale = defaultScale(recipe) * userScale;
  const isMuted = status === "cooked" || status === "skipped";

  async function doShuffle() {
    setBusy("shuffle");
    try { await onShuffle(); } catch { alert("Couldn't shuffle — try again."); }
    finally { setBusy(null); }
  }

  async function doBan() {
    if (!confirm("Remove this recipe permanently so it never appears again?")) return;
    setBusy("ban");
    try { await onBan(); } catch { alert("Couldn't remove — try again."); }
    finally { setBusy(null); }
  }

  function toggleStatus(next: CookedStatus) {
    onStatusChange(status === next ? "none" : next);
  }

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm flex flex-col gap-3 transition-opacity ${
        isMuted ? "opacity-50" : "opacity-100"
      } ${
        status === "cooked"
          ? "bg-emerald-50 border-emerald-200"
          : status === "skipped"
          ? "bg-gray-50 border-gray-200"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
            {DAY_LABELS[position]}
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
      <ul className="text-sm text-gray-700 space-y-0.5 list-disc list-inside flex-1">
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>{scaleIngredient(ing, totalScale)}</li>
        ))}
      </ul>

      {/* Primary actions */}
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
            onClick={() => toggleStatus("cooked")}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              status === "cooked"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-emerald-500"
            }`}
          >
            ✓ Cooked
          </button>
          <button
            onClick={() => toggleStatus("skipped")}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              status === "skipped"
                ? "bg-gray-500 text-white border-gray-500"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            Skip
          </button>
          <button
            onClick={doShuffle}
            disabled={busy !== null}
            className="text-xs px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-600 hover:border-emerald-500 font-medium transition-colors disabled:opacity-40"
          >
            {busy === "shuffle" ? "..." : "⟳ Shuffle"}
          </button>
        </div>
      </div>

      {/* Remove permanently */}
      <button
        onClick={doBan}
        disabled={busy !== null}
        className="text-xs text-red-400 hover:text-red-600 text-left disabled:opacity-40 transition-colors"
      >
        {busy === "ban" ? "Removing..." : "✕ Remove this recipe permanently"}
      </button>
    </div>
  );
}
