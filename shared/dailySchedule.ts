export const FALLBACK_MOVIE_IDS = ["550", "603", "27205", "157336", "299536", "823464"];

export type DailySchedule = { day: string; movieId: string };

/** Calendar day in Vietnam (YYYY-MM-DD). */
export function vnDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function pickRandomMovieId(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)] ?? FALLBACK_MOVIE_IDS[0];
}

/** Parse TMDB movie id from generated showtime id, e.g. st-550-2026-07-08-1 */
export function showtimeMovieId(showtimeId: string): string | null {
  const m = showtimeId.match(/^st-(\d+)-/);
  return m ? m[1] : null;
}
