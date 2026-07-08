import type { AdminSettings, Movie, MovieStatus } from "./types";
import { inferMovieStatus } from "./movieHelpers";

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function movieIdFromTmdb(tmdbId: number) {
  return String(tmdbId);
}

export function normalizeMovieInput(body: Record<string, unknown>, existing?: Movie): Movie {
  const now = new Date().toISOString();
  const releaseDate = body.releaseDate != null ? String(body.releaseDate) : existing?.releaseDate;
  const status =
    (body.status as MovieStatus | undefined) ?? existing?.status ?? inferMovieStatus(releaseDate);

  return {
    id: existing?.id ?? String(body.id ?? createId("m")),
    title: String(body.title ?? existing?.title ?? ""),
    description: String(body.description ?? existing?.description ?? ""),
    durationMin: Number(body.durationMin ?? existing?.durationMin ?? 90),
    posterUrl: body.posterUrl != null ? String(body.posterUrl) : existing?.posterUrl,
    posterS3Key: body.posterS3Key != null ? String(body.posterS3Key) : existing?.posterS3Key,
    backdropUrl: body.backdropUrl != null ? String(body.backdropUrl) : existing?.backdropUrl,
    rating: body.rating != null ? String(body.rating) : existing?.rating,
    genre: body.genre != null ? String(body.genre) : existing?.genre,
    tmdbId: body.tmdbId != null ? Number(body.tmdbId) : existing?.tmdbId,
    status,
    releaseDate,
    trailerUrl: body.trailerUrl != null ? String(body.trailerUrl) : existing?.trailerUrl,
    director: body.director != null ? String(body.director) : existing?.director,
    cast: Array.isArray(body.cast) ? body.cast.map(String) : existing?.cast,
    distributorSharePct:
      body.distributorSharePct != null
        ? Number(body.distributorSharePct)
        : existing?.distributorSharePct,
    lockedFields: Array.isArray(body.lockedFields)
      ? body.lockedFields.map(String)
      : existing?.lockedFields,
    isArchived: body.isArchived != null ? Boolean(body.isArchived) : existing?.isArchived,
    archivedAt: body.archivedAt != null ? String(body.archivedAt) : existing?.archivedAt,
    syncedAt: body.syncedAt != null ? String(body.syncedAt) : existing?.syncedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function normalizeAdminSettings(
  body: Record<string, unknown>,
  existing?: AdminSettings
): AdminSettings {
  return {
    cloudwatchDashboardUrl:
      body.cloudwatchDashboardUrl != null
        ? String(body.cloudwatchDashboardUrl)
        : existing?.cloudwatchDashboardUrl,
    cloudwatchRumConsoleUrl:
      body.cloudwatchRumConsoleUrl != null
        ? String(body.cloudwatchRumConsoleUrl)
        : existing?.cloudwatchRumConsoleUrl,
  };
}
