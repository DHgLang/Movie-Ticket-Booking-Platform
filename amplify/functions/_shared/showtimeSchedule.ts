/** Standard cinema show slots (local time). */
export const SHOWTIME_SLOTS = [
  "00:00",
  "02:00",
  "09:00",
  "11:45",
  "14:30",
  "17:15",
  "20:00",
  "22:45",
] as const;

export function slotToMinutes(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}

export function formatLocalISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function buildLocalDateTime(day: Date, slot: string): Date {
  const [h, m] = slot.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export function fitsSlot(slot: string, durationMin: number, cleanupMin: number): boolean {
  const start = slotToMinutes(slot);
  const end = start + durationMin + cleanupMin;
  const idx = SHOWTIME_SLOTS.indexOf(slot as (typeof SHOWTIME_SLOTS)[number]);
  const limit = idx < SHOWTIME_SLOTS.length - 1 ? slotToMinutes(SHOWTIME_SLOTS[idx + 1]) : 24 * 60;
  return end <= limit;
}

export function validSlotsForDuration(durationMin: number, cleanupMin: number): string[] {
  return SHOWTIME_SLOTS.filter((s) => fitsSlot(s, durationMin, cleanupMin));
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export type ScheduleScreen = { id: string; cinemaId: string };

export type ScheduleInput = {
  movieId: string;
  durationMin: number;
  cleanupMin: number;
  screens: ScheduleScreen[];
  count: number;
  existingOnScreens: { screenId: string; startsAt: string; durationMin: number; cleanupMin?: number }[];
  cinemaId?: string;
  preferDate?: string;
};

export type GeneratedShowtime = {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  price: number;
};

export function generateShowtimes(input: ScheduleInput): GeneratedShowtime[] {
  const nowMs = Date.now();
  const cleanup = input.cleanupMin;
  let validSlots = validSlotsForDuration(input.durationMin, cleanup);
  if (validSlots.length === 0) validSlots = [...SHOWTIME_SLOTS];

  let screens = input.screens;
  if (input.cinemaId) screens = screens.filter((s) => s.cinemaId === input.cinemaId);
  if (screens.length === 0) screens = input.screens;

  const occupiedByScreen = new Map<string, { start: number; end: number }[]>();
  for (const ex of input.existingOnScreens) {
    const start = new Date(ex.startsAt).getTime();
    const gap = ex.cleanupMin ?? cleanup;
    const end = start + (ex.durationMin + gap) * 60 * 1000;
    const list = occupiedByScreen.get(ex.screenId) ?? [];
    list.push({ start, end });
    occupiedByScreen.set(ex.screenId, list);
  }

  const hasConflict = (screenId: string, startMs: number, endMs: number) => {
    const busy = occupiedByScreen.get(screenId) ?? [];
    return busy.some((b) => rangesOverlap(b.start, b.end, startMs, endMs));
  };

  const picked: GeneratedShowtime[] = [];
  const usedSlotKeys = new Set<string>();
  let screenIdx = 0;

  const startDay = new Date(nowMs);
  startDay.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 14 && picked.length < input.count; dayOffset++) {
    const day = new Date(startDay);
    day.setDate(day.getDate() + dayOffset);
    const dayKey = formatLocalISO(day).slice(0, 10);

    if (input.preferDate) {
      if (dayKey < input.preferDate) continue;
      if (dayKey > input.preferDate) break;
    }

    for (const slot of validSlots) {
      if (picked.length >= input.count) break;

      const slotKey = `${dayKey}@${slot}`;
      if (usedSlotKeys.has(slotKey)) continue;

      const startsAt = buildLocalDateTime(day, slot);
      if (startsAt.getTime() <= nowMs) continue;

      const startMs = startsAt.getTime();
      const endMs = startMs + (input.durationMin + cleanup) * 60 * 1000;

      for (let i = 0; i < screens.length; i++) {
        const screen = screens[(screenIdx + i) % screens.length];
        if (hasConflict(screen.id, startMs, endMs)) continue;

        const price = Math.round((10 + Math.random() * 4.5) * 2) / 2;
        picked.push({
          id: `st-${input.movieId}-${dayKey}-${picked.length + 1}`,
          movieId: input.movieId,
          screenId: screen.id,
          startsAt: formatLocalISO(startsAt),
          price,
        });

        usedSlotKeys.add(slotKey);
        screenIdx = (screenIdx + i + 1) % screens.length;

        const busy = occupiedByScreen.get(screen.id) ?? [];
        busy.push({ start: startMs, end: endMs });
        occupiedByScreen.set(screen.id, busy);
        break;
      }
    }

    if (!input.preferDate && picked.length >= input.count) break;
  }

  if (picked.length === 0 && input.preferDate) {
    return generateShowtimes({ ...input, preferDate: undefined });
  }

  return picked.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function randomShowtimeCount(): number {
  return 3 + Math.floor(Math.random() * 3);
}

export function randomCleanupMin(): number {
  return 15 + Math.floor(Math.random() * 6);
}

export function hasDistinctSlotTimes(showtimes: { startsAt: string }[]): boolean {
  if (showtimes.length === 0) return true;
  const times = showtimes.map((s) => s.startsAt.slice(11, 16));
  return new Set(times).size === times.length;
}
