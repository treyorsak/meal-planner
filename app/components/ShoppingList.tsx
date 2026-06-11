"use client";

import { Recipe, scaleIngredient, defaultScale } from "@/app/lib/recipes";

const CATEGORIES: { label: string; keywords: RegExp }[] = [
  { label: "Produce", keywords: /\b(onion|garlic|tomato|pepper|carrot|celery|potato|broccoli|spinach|lettuce|lemon|lime|apple|orange|mushroom|zucchini|squash|cucumber|avocado|herb|basil|cilantro|parsley|thyme|rosemary|sage|ginger|jalapen|green bean|corn|pea|asparagus|cabbage|kale|berry|berries|fruit|vegetable)\b/i },
  { label: "Proteins & Meat", keywords: /\b(chicken|beef|pork|ground|steak|sausage|bacon|ham|turkey|shrimp|fish|salmon|tuna|crab|lobster|egg|tofu|lamb|veal|brisket|roast)\b/i },
  { label: "Dairy", keywords: /\b(milk|cream|butter|cheese|yogurt|sour cream|cream cheese|parmesan|mozzarella|cheddar|half[- ]and[- ]half|heavy cream|whipping cream)\b/i },
  { label: "Pantry & Dry Goods", keywords: /\b(flour|sugar|salt|pepper|oil|vinegar|broth|stock|can|canned|pasta|rice|bean|lentil|sauce|paste|powder|seasoning|spice|baking|bread|crumb|cornstarch|honey|syrup|mustard|ketchup|mayo|soy|Worcestershire|hot sauce|vanilla)\b/i },
];

type Props = {
  recipes: Recipe[];
  userScale: number;
};

export default function ShoppingList({ recipes, userScale }: Props) {
  const allIngredients: { text: string; meal: string }[] = recipes.flatMap((r) => {
    const scale = defaultScale(r) * userScale;
    return r.ingredients.map((ing) => ({
      text: scaleIngredient(ing, scale),
      meal: r.title,
    }));
  });

  function categorize(items: { text: string; meal: string }[]) {
    const buckets: Record<string, { text: string; meal: string }[]> = {
      Produce: [],
      "Proteins & Meat": [],
      Dairy: [],
      "Pantry & Dry Goods": [],
      Other: [],
    };
    for (const item of items) {
      const cat = CATEGORIES.find((c) => c.keywords.test(item.text));
      const bucket = cat ? cat.label : "Other";
      buckets[bucket].push(item);
    }
    return buckets;
  }

  const grouped = categorize(allIngredients);

  return (
    <div className="space-y-6 print:space-y-4">
      {Object.entries(grouped)
        .filter(([, items]) => items.length > 0)
        .map(([category, items]) => (
          <section key={category}>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2 border-b pb-1">
              {category}
            </h2>
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="mt-0.5 accent-emerald-600 print:hidden" />
                  <span>
                    {item.text}
                    <span className="text-gray-400 text-xs ml-1">({item.meal})</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
