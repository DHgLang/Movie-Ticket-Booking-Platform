import type { Movie } from "../../../shared/types";
import { inferMovieStatus, mergeMovieWithLocks } from "../../../shared/movieHelpers";
import { movieIdFromTmdb, normalizeMovieInput } from "../../../shared/movieAdmin";
import { fetchTmdbMovieDetails, mapTmdbToMovieFields } from "./tmdb";

export { movieIdFromTmdb, normalizeMovieInput } from "../../../shared/movieAdmin";
export { normalizeAdminSettings } from "../../../shared/movieAdmin";

export async function buildMovieFromTmdb(tmdbId: number, existing?: Movie): Promise<Movie> {
  const details = await fetchTmdbMovieDetails(tmdbId);
  if (!details) throw new Error("TMDB movie not found");

  const mapped = mapTmdbToMovieFields(details);
  const releaseDate = mapped.releaseDate;
  const status = existing?.status ?? inferMovieStatus(releaseDate);

  const incoming: Partial<Movie> = {
    ...mapped,
    id: existing?.id ?? movieIdFromTmdb(tmdbId),
    status,
    distributorSharePct: existing?.distributorSharePct ?? 50,
    lockedFields: existing?.lockedFields,
    isArchived: existing?.isArchived,
    archivedAt: existing?.archivedAt,
    createdAt: existing?.createdAt,
  };

  if (existing) return mergeMovieWithLocks(existing, incoming);

  return normalizeMovieInput(incoming as Record<string, unknown>);
}
