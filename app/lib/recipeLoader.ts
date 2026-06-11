// Server-only: loads recipe JSON from disk. Do NOT import this in client components.
import { readFileSync, existsSync } from "fs";
import path from "path";
import type { Recipe } from "./recipes";

function loadJSON(filename: string): Recipe[] {
  const filepath = path.join(process.cwd(), "data", filename);
  if (!existsSync(filepath)) return [];
  try {
    return JSON.parse(readFileSync(filepath, "utf-8")) as Recipe[];
  } catch {
    return [];
  }
}

let _blogspot: Recipe[] | null = null;
let _allrecipes: Recipe[] | null = null;

export function getBlogspotRecipes(): Recipe[] {
  if (!_blogspot) _blogspot = loadJSON("blogspot_recipes.json");
  return _blogspot;
}

export function getAllrecipesRecipes(): Recipe[] {
  if (!_allrecipes) _allrecipes = loadJSON("allrecipes_recipes.json");
  return _allrecipes;
}

export function getRecipeById(id: string): Recipe | undefined {
  return [...getBlogspotRecipes(), ...getAllrecipesRecipes()].find((r) => r.id === id);
}
