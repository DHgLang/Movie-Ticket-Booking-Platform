export type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  runtime?: number;
  original_language?: string;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { name: string; order: number }[];
    crew?: { job: string; name: string }[];
  };
};

export type TmdbListResponse = {
  results: TmdbMovie[];
  page: number;
  total_results: number;
};

export function posterUrl(path: string | null, size: "w342" | "w500" | "original" = "w500") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

async function tmdbFetch<T>(path: string): Promise<T> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
  if (apiKey) {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
    return res.json() as Promise<T>;
  }
  const res = await fetch(`/tmdb${path}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const tmdb = {
  nowPlaying: (page = 1) =>
    tmdbFetch<TmdbListResponse>(
      `/movie/now_playing?language=en-US&region=VN&page=${page}`
    ),
  upcoming: (page = 1) =>
    tmdbFetch<TmdbListResponse>(
      `/movie/upcoming?language=en-US&region=VN&page=${page}`
    ),
  popular: () => tmdbFetch<TmdbListResponse>("/movie/popular?language=en-US&page=1"),
  search: (query: string) =>
    tmdbFetch<TmdbListResponse>(
      `/search/movie?language=en-US&query=${encodeURIComponent(query)}&page=1`
    ),
  getMovie: (id: string | number) =>
    tmdbFetch<TmdbMovie>(
      `/movie/${id}?language=en-US&append_to_response=credits`
    ),
};
