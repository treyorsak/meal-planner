import { NextRequest, NextResponse } from "next/server";
import { getRecipeById } from "@/app/lib/recipeLoader";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = getRecipeById(id);
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(recipe);
}
