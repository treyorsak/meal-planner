import WeeklyPlan from "@/app/components/WeeklyPlan";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <WeeklyPlan />
      </div>
    </main>
  );
}
