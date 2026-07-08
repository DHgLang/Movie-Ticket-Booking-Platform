import type { Movie, MovieStatus } from "./types";

export const MOVIE_LOCKABLE_FIELDS = [
  "title",
  "description",
  "durationMin",
  "posterUrl",
  "posterS3Key",
  "backdropUrl",
  "rating",
  "genre",
  "status",
  "releaseDate",
  "trailerUrl",
  "director",
  "cast",
  "distributorSharePct",
] as const;

export type MovieLockableField = (typeof MOVIE_LOCKABLE_FIELDS)[number];

export function inferMovieStatus(releaseDate?: string, today = new Date()): MovieStatus {
  if (!releaseDate) return "NOW_SHOWING";
  const release = new Date(`${releaseDate}T00:00:00`);
  if (release > today) return "COMING_SOON";
  return "NOW_SHOWING";
}

export function moviePosterSrc(movie: Movie, posterCdnBase?: string): string {
  if (movie.posterUrl) return movie.posterUrl;
  if (movie.posterS3Key && posterCdnBase) {
    return `${posterCdnBase.replace(/\/$/, "")}/${movie.posterS3Key}`;
  }
  return "";
}

export function isMovieVisibleToPublic(movie: Movie): boolean {
  if (movie.isArchived) return false;
  return true;
}

export function mergeMovieWithLocks(current: Movie, incoming: Partial<Movie>): Movie {
  const locked = new Set(current.lockedFields ?? []);
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "lockedFields" || key === "id" || key === "createdAt") continue;
    if (locked.has(key)) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

export function statusLabel(status?: MovieStatus): string {
  switch (status) {
    case "COMING_SOON":
      return "Sắp chiếu";
    case "SPECIAL":
      return "Suất đặc biệt";
    default:
      return "Đang chiếu";
  }
}

/** Public listing tabs: now showing vs coming soon / advance sales */
export function filterMoviesByTab(movies: Movie[], tab?: string | null): Movie[] {
  if (tab === "soon" || tab === "advance") {
    return movies.filter((m) => m.status === "COMING_SOON");
  }
  return movies.filter((m) => m.status === "NOW_SHOWING" || m.status === "SPECIAL");
}
