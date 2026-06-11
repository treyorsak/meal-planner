import { getISOWeekKey, formatWeekRange } from "@/app/lib/week";
import WeeklyPlan from "@/app/components/WeeklyPlan";

export default function Home() {
  const weekKey = getISOWeekKey();
  const weekLabel = formatWeekRange(weekKey);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <WeeklyPlan weekKey={weekKey} weekLabel={weekLabel} />
      </div>
    </main>
  );
}
