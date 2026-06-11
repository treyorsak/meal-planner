// Client-safe: types + pure utility functions only. No Node.js imports.

export type Recipe = {
  id: string;
  title: string;
  url: string;
  published?: string;
  source: "blogspot" | "allrecipes";
  servings: number;
  ingredients: string[];
};

/** Scale factor to hit 6 servings based on a recipe's stated serving count. */
export function defaultScale(recipe: Recipe): number {
  return recipe.servings > 0 ? 6 / recipe.servings : 1.5;
}

/** Scale an ingredient string by a numeric factor. Handles fractions like 1/2, 1 1/2. */
export function scaleIngredient(ingredient: string, factor: number): string {
  if (factor === 1) return ingredient;
  return ingredient.replace(
    /(\d+)\s+(\d+)\/(\d+)|(\d+)\/(\d+)|(\d+\.?\d*)/g,
    (_match, whole, num, den, fracNum, fracDen, decimal) => {
      let value: number;
      if (whole !== undefined) {
        value = parseInt(whole) + parseInt(num) / parseInt(den);
      } else if (fracNum !== undefined) {
        value = parseInt(fracNum) / parseInt(fracDen);
      } else {
        value = parseFloat(decimal);
      }
      return formatQuantity(value * factor);
    }
  );
}

function formatQuantity(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const fractions: [number, string][] = [
    [0.25, "1/4"], [0.33, "1/3"], [0.5, "1/2"], [0.67, "2/3"], [0.75, "3/4"],
    [1.25, "1 1/4"], [1.33, "1 1/3"], [1.5, "1 1/2"], [1.67, "1 2/3"], [1.75, "1 3/4"],
    [2.5, "2 1/2"], [3.5, "3 1/2"],
  ];
  for (const [val, label] of fractions) {
    if (Math.abs(n - val) < 0.04) return label;
  }
  return n.toFixed(1).replace(/\.0$/, "");
}
