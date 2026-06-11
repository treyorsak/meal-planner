"use client";

import { useEffect, useState } from "react";

const PRESETS = [
  { label: "×½", value: 0.5 },
  { label: "×1", value: 1.0 },
  { label: "×1½", value: 1.5 },
  { label: "×2", value: 2.0 },
];

const STORAGE_KEY = "mealplanner-scale";

type Props = {
  onChange: (scale: number) => void;
};

export default function ServingScaler({ onChange }: Props) {
  const [active, setActive] = useState(1.0);

  useEffect(() => {
    const stored = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "1");
    const valid = PRESETS.find((p) => p.value === stored)?.value ?? 1.0;
    setActive(valid);
    onChange(valid);
  }, [onChange]);

  function select(value: number) {
    setActive(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    onChange(value);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 font-medium">Scale ingredients:</span>
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${
            active === p.value
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-gray-700 border-gray-300 hover:border-emerald-500"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="text-xs text-gray-400 ml-1">(recipes are written for 4 — default ×1½ serves 6)</span>
    </div>
  );
}
