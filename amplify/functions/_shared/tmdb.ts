const DEFAULT_RUNTIME = 120;
const runtimeCache = new Map<string, number>();

export type TmdbMovieDetails = {
  id: number;
  title: string;
  overview: string;
  runtime?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  genres?: { name: string }[];
  credits?: {
    crew?: { job: string; name: string }[];
    cast?: { name: string; character?: string }[];
  };
  videos?: { results?: { site: string; type: string; key: string }[] };
};

function posterUrl(path: string | null | undefined) {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

function backdropUrl(path: string | null | undefined) {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/w1280${path}`;
}

function trailerUrl(videos?: TmdbMovieDetails["videos"]) {
  const yt = videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer");
  return yt ? `https://www.youtube.com/watch?v=${yt.key}` : undefined;
}

export async function fetchTmdbRuntime(movieId: string): Promise<number> {
  const details = await fetchTmdbMovieDetails(movieId);
  return details?.runtime ?? DEFAULT_RUNTIME;
}

export function getCachedRuntime(movieId: string): number | undefined {
  return runtimeCache.get(movieId);
}

export async function fetchTmdbMovieDetails(movieId: string | number): Promise<TmdbMovieDetails | null> {
  const id = String(movieId);
  if (!/^\d+$/.test(id)) return null;

  const apiKey = process.env.TMDB_API_KEY ?? "";
  if (!apiKey) return null;

  try {
    const url = `https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=credits,videos&api_key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as TmdbMovieDetails;
    if (data.runtime && data.runtime > 0) runtimeCache.set(id, data.runtime);
    return data;
  } catch {
    return null;
  }
}

export function mapTmdbToMovieFields(data: TmdbMovieDetails) {
  const director = data.credits?.crew?.find((c) => c.job === "Director")?.name;
  const cast = (data.credits?.cast ?? []).slice(0, 8).map((c) => c.name);
  const genre = data.genres?.map((g) => g.name).join(", ");
  return {
    tmdbId: data.id,
    title: data.title,
    description: data.overview ?? "",
    durationMin: data.runtime && data.runtime > 0 ? data.runtime : DEFAULT_RUNTIME,
    posterUrl: posterUrl(data.poster_path),
    backdropUrl: backdropUrl(data.backdrop_path),
    releaseDate: data.release_date || undefined,
    trailerUrl: trailerUrl(data.videos),
    director,
    cast,
    genre,
    syncedAt: new Date().toISOString(),
  };
}
