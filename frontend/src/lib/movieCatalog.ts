import type { Movie } from "../../../shared/types";
import {
  buildAdminCatalog,
  buildPublicCatalog,
  mergeTmdbWithOverride,
  manualToCatalog,
  type CatalogMovie,
  type TmdbListItem,
} from "../../../shared/tmdbCatalog";
import { api } from "./api";
import { tmdb, type TmdbMovie } from "./tmdb";

export type { CatalogMovie };

function toListItem(m: TmdbMovie): TmdbListItem {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    vote_average: m.vote_average,
    release_date: m.release_date,
  };
}

export async function fetchTmdbPools(): Promise<{
  nowPlayingPool: TmdbListItem[];
  upcomingPool: TmdbListItem[];
}> {
  const [page1, page2, page3, upcoming1, upcoming2] = await Promise.all([
    tmdb.nowPlaying(1),
    tmdb.nowPlaying(2),
    tmdb.nowPlaying(3),
    tmdb.upcoming(1),
    tmdb.upcoming(2),
  ]);
  const nowPlayingPool = [...page1.results, ...page2.results, ...page3.results].map(toListItem);
  const upcomingPool = [...upcoming1.results, ...upcoming2.results].map(toListItem);
  return { nowPlayingPool, upcomingPool };
}

export async function fetchMovieOverrides(): Promise<{
  items: Movie[];
  posterCdnBase?: string;
}> {
  return api.getMovieOverrides();
}

export async function fetchPublicCatalog(): Promise<{
  nowShowing: CatalogMovie[];
  comingSoon: CatalogMovie[];
  posterCdnBase?: string;
}> {
  const [{ nowPlayingPool, upcomingPool }, overrides] = await Promise.all([
    fetchTmdbPools(),
    fetchMovieOverrides(),
  ]);
  const catalog = buildPublicCatalog({
    nowPlayingPool,
    upcomingPool,
    overrides: overrides.items,
    posterCdnBase: overrides.posterCdnBase,
  });
  return { ...catalog, posterCdnBase: overrides.posterCdnBase };
}

export async function fetchAdminCatalog(archivedOnly = false): Promise<{
  nowShowing: CatalogMovie[];
  comingSoon: CatalogMovie[];
  posterCdnBase?: string;
}> {
  const [{ nowPlayingPool, upcomingPool }, overrides] = await Promise.all([
    fetchTmdbPools(),
    fetchMovieOverrides(),
  ]);
  const catalog = buildAdminCatalog({
    nowPlayingPool,
    upcomingPool,
    overrides: overrides.items,
    posterCdnBase: overrides.posterCdnBase,
    archivedOnly,
  });
  return { ...catalog, posterCdnBase: overrides.posterCdnBase };
}

export async function fetchMovieDisplay(id: string): Promise<CatalogMovie | null> {
  const overrides = await fetchMovieOverrides();
  const stored = overrides.items.find((m) => m.id === id);
  if (stored?.isArchived) return null;

  if (/^\d+$/.test(id)) {
    try {
      const t = await tmdb.getMovie(id);
      const item = toListItem(t);
      const catalog = mergeTmdbWithOverride(item, stored, overrides.posterCdnBase);
      const director =
        stored?.director ??
        t.credits?.crew?.find((c) => c.job === "Director")?.name ??
        catalog.director;
      const cast =
        stored?.cast?.length ?
          stored.cast
        : (t.credits?.cast?.slice(0, 8).map((c) => c.name) ?? catalog.cast);
      const genre =
        stored?.genre ?? t.genres?.map((g) => g.name).join(" / ") ?? catalog.genre;
      const durationMin = stored?.durationMin ?? t.runtime ?? catalog.durationMin;
      const language = t.original_language ?
        t.original_language.toUpperCase()
      : undefined;
      return {
        ...catalog,
        director,
        cast,
        genre,
        durationMin,
        rating: catalog.rating,
        description: catalog.description || t.overview || "",
        releaseDate: catalog.releaseDate || t.release_date || undefined,
        ...(language ? { language } : {}),
      } as CatalogMovie & { language?: string };
    } catch {
      return stored ? manualToCatalog(stored, overrides.posterCdnBase) : null;
    }
  }

  return stored ? manualToCatalog(stored, overrides.posterCdnBase) : null;
}

export { catalogForTab, catalogIsNowShowing } from "../../../shared/tmdbCatalog";
