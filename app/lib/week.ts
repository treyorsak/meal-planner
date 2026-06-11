export function getISOWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getWeekDateRange(weekKey: string): { start: Date; end: Date } {
  const [year, weekStr] = weekKey.split("-W");
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(parseInt(year, 10), 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  return { start: monday, end: friday };
}

export function formatWeekRange(weekKey: string): string {
  const { start, end } = getWeekDateRange(weekKey);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}
