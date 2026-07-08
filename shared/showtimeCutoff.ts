/** Stop online sales this many minutes before showtime (Vietnam local time). */
export const SALE_CUTOFF_MINUTES = 10;
const SALE_CUTOFF_MS = SALE_CUTOFF_MINUTES * 60 * 1000;
const VN_OFFSET = "+07:00";

export const SHOWTIME_CLOSED_MSG = "Showtime no longer available";

/** startsAt is stored as local VN wall time, e.g. 2026-07-08T20:00:00 */
export function showtimeStartMs(startsAt: string): number {
  if (startsAt.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(startsAt)) {
    return new Date(startsAt).getTime();
  }
  return new Date(`${startsAt}${VN_OFFSET}`).getTime();
}

export function msUntilShowtime(startsAt: string, nowMs = Date.now()): number {
  return showtimeStartMs(startsAt) - nowMs;
}

/** Listed in UI and open for lock/checkout when more than 10 minutes before start. */
export function isShowtimeBookable(startsAt: string, nowMs = Date.now()): boolean {
  return msUntilShowtime(startsAt, nowMs) > SALE_CUTOFF_MS;
}
