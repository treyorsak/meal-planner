// Week runs Thursday → Wednesday. Key format: "2026-THU-0619" (the Thursday date).

export function getISOWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Roll back to the most recent Thursday (UTC day 4)
  const dayOfWeek = d.getUTCDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  const daysBack = (dayOfWeek - 4 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysBack);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-THU-${month}${day}`;
}

export function getWeekDateRange(weekKey: string): { start: Date; end: Date } {
  // Parse "2026-THU-0619" → Thursday Jun 19 2026
  const [year, , monthDay] = weekKey.split("-");
  const month = parseInt(monthDay.slice(0, 2), 10) - 1;
  const day = parseInt(monthDay.slice(2, 4), 10);
  const start = new Date(Date.UTC(parseInt(year, 10), month, day));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6); // following Wednesday
  return { start, end };
}

export function formatWeekRange(weekKey: string): string {
  const { start } = getWeekDateRange(weekKey);
  // Show Thu → Mon (the 5 dinner nights), not the full Thu–Wed window
  const monday = new Date(start);
  monday.setUTCDate(start.getUTCDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" };
  return `${start.toLocaleDateString("en-US", opts)} – ${monday.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}
