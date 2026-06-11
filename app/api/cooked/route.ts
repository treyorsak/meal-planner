import { NextRequest, NextResponse } from "next/server";
import { getPlan, setPlan } from "@/app/lib/planStore";
import { getISOWeekKey } from "@/app/lib/week";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { week, recipeId, status } = body as {
    week: string;
    recipeId: string;
    status: "cooked" | "skipped" | "none";
  };

  const weekKey = week ?? getISOWeekKey();
  const plan = await getPlan(weekKey);
  if (!plan) {
    return NextResponse.json({ error: "No plan for this week" }, { status: 404 });
  }

  const cooked = { ...plan.cooked };
  if (status === "none") {
    delete cooked[recipeId];
  } else {
    cooked[recipeId] = status;
  }

  await setPlan(weekKey, { ...plan, cooked });
  return NextResponse.json({ ok: true, cooked });
}
