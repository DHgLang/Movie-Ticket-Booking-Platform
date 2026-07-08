import { FALLBACK_MOVIE_IDS, pickRandomMovieId, vnDayKey, type DailySchedule } from "../../../shared/dailySchedule";

export async function fetchNowPlayingIds(): Promise<string[]> {
  const apiKey = process.env.TMDB_API_KEY ?? "";
  if (!apiKey) return [...FALLBACK_MOVIE_IDS];

  try {
    const url = `https://api.themoviedb.org/3/movie/now_playing?language=en-US&region=VN&page=1&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [...FALLBACK_MOVIE_IDS];
    const data = (await res.json()) as { results?: { id: number }[] };
    const ids = (data.results ?? []).map((m) => String(m.id));
    return ids.length ? ids : [...FALLBACK_MOVIE_IDS];
  } catch {
    return [...FALLBACK_MOVIE_IDS];
  }
}

export { vnDayKey, type DailySchedule };
