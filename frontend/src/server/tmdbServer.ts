const DEFAULT_RUNTIME = 120;
const runtimeCache = new Map<string, number>();

let tmdbApiKey = "";

export function configureTmdbServer(apiKey: string) {
  tmdbApiKey = apiKey;
}

export async function fetchTmdbRuntime(movieId: string): Promise<number> {
  if (!/^\d+$/.test(movieId)) return DEFAULT_RUNTIME;

  const cached = runtimeCache.get(movieId);
  if (cached != null) return cached;

  if (!tmdbApiKey) {
    runtimeCache.set(movieId, DEFAULT_RUNTIME);
    return DEFAULT_RUNTIME;
  }

  try {
    const url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
    const res = await fetch(`${url}&api_key=${tmdbApiKey}`);
    if (!res.ok) {
      runtimeCache.set(movieId, DEFAULT_RUNTIME);
      return DEFAULT_RUNTIME;
    }
    const data = (await res.json()) as { runtime?: number };
    const runtime = data.runtime && data.runtime > 0 ? data.runtime : DEFAULT_RUNTIME;
    runtimeCache.set(movieId, runtime);
    return runtime;
  } catch {
    runtimeCache.set(movieId, DEFAULT_RUNTIME);
    return DEFAULT_RUNTIME;
  }
}

export function getCachedRuntime(movieId: string): number | undefined {
  return runtimeCache.get(movieId);
}

export async function fetchNowPlayingIds(): Promise<string[]> {
  if (!tmdbApiKey) return [];
  try {
    const url = `https://api.themoviedb.org/3/movie/now_playing?language=en-US&region=VN&page=1&api_key=${tmdbApiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { id: number }[] };
    return (data.results ?? []).map((m) => String(m.id));
  } catch {
    return [];
  }
}
