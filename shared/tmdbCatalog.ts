import type { Movie, MovieStatus } from "./types";
import { mergeMovieWithLocks, moviePosterSrc } from "./movieHelpers";

/** Minimal TMDB list item (now_playing / upcoming). */
export type TmdbListItem = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
};

export type CatalogMovie = {
  id: string;
  tmdbId?: number;
  title: string;
  description: string;
  durationMin: number;
  posterUrl: string;
  backdropUrl?: string;
  voteAverage?: number;
  rating?: string;
  genre?: string;
  status: MovieStatus;
  releaseDate?: string;
  isManual?: boolean;
  lockedFields?: string[];
  isArchived?: boolean;
  trailerUrl?: string;
  director?: string;
  cast?: string[];
  distributorSharePct?: number;
  language?: string;
};

/** TMDB ★ 0.0 = Coming Soon; có sao (>0) = Now Showing. */
export function tmdbHasStars(t: TmdbListItem): boolean {
  return t.vote_average > 0;
}

export function statusFromTmdbStars(voteAverage: number): MovieStatus {
  return voteAverage > 0 ? "NOW_SHOWING" : "COMING_SOON";
}

export function catalogIsNowShowing(m: CatalogMovie): boolean {
  if (m.isManual) return false;
  return (m.voteAverage ?? 0) > 0;
}

export function catalogHasPoster(movie: CatalogMovie): boolean {
  return Boolean(movie.posterUrl?.trim());
}

export function tmdbItemHasPoster(t: TmdbListItem, override?: Movie, posterCdnBase?: string): boolean {
  if (override?.isArchived) return false;
  const fromOverride = override ? moviePosterSrc(override, posterCdnBase) || override.posterUrl : "";
  if (fromOverride?.trim()) return true;
  return Boolean(t.poster_path?.trim());
}

export function manualMovieHasPoster(m: Movie, posterCdnBase?: string): boolean {
  if (m.isArchived) return false;
  return Boolean(moviePosterSrc(m, posterCdnBase) || m.posterUrl?.trim());
}

export function tmdbImageUrl(path: string | null, size = "w500"): string {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function dailyCatalogSeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickCount(seed: number, min: number, max: number): number {
  const rng = mulberry32(seed);
  return min + Math.floor(rng() * (max - min + 1));
}

export function takeFirst<T>(items: T[], count: number): T[] {
  return items.slice(0, count);
}

export function overrideById(overrides: Movie[]): Map<string, Movie> {
  return new Map(overrides.map((m) => [m.id, m]));
}

function tmdbBaseMovie(t: TmdbListItem): Movie {
  const status = statusFromTmdbStars(t.vote_average);
  return {
    id: String(t.id),
    tmdbId: t.id,
    title: t.title,
    description: t.overview || "",
    durationMin: 120,
    posterUrl: tmdbImageUrl(t.poster_path),
    backdropUrl: tmdbImageUrl(t.backdrop_path, "w1280"),
    releaseDate: t.release_date || undefined,
    status,
    distributorSharePct: 50,
  };
}

export function mergeTmdbWithOverride(
  t: TmdbListItem,
  override: Movie | undefined,
  posterCdnBase: string | undefined
): CatalogMovie {
  const tabStatus = statusFromTmdbStars(t.vote_average);
  const base = tmdbBaseMovie(t);
  let merged: Movie = override ? mergeMovieWithLocks(override, base) : base;

  merged.status = tabStatus;

  if (!merged.description?.trim()) {
    merged.description = t.overview || "";
  }
  if (tabStatus === "COMING_SOON" && override?.description?.trim()) {
    merged.description = override.description;
  }

  return toCatalogMovie(merged, t.vote_average, posterCdnBase);
}

export function manualToCatalog(m: Movie, posterCdnBase?: string): CatalogMovie {
  const status: MovieStatus = "COMING_SOON";
  return toCatalogMovie({ ...m, status }, undefined, posterCdnBase, true);
}

function toCatalogMovie(
  m: Movie,
  voteAverage: number | undefined,
  posterCdnBase: string | undefined,
  isManual = false
): CatalogMovie {
  const poster = moviePosterSrc(m, posterCdnBase) || m.posterUrl || "";
  const status = isManual ? "COMING_SOON" : statusFromTmdbStars(voteAverage ?? 0);
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    title: m.title,
    description: m.description || "",
    durationMin: m.durationMin,
    posterUrl: poster,
    backdropUrl: m.backdropUrl,
    voteAverage,
    rating: m.rating,
    genre: m.genre,
    status,
    releaseDate: m.releaseDate,
    isManual,
    lockedFields: m.lockedFields,
    isArchived: m.isArchived,
    trailerUrl: m.trailerUrl,
    director: m.director,
    cast: m.cast,
    distributorSharePct: m.distributorSharePct,
  };
}

export type BuildCatalogInput = {
  nowPlayingPool: TmdbListItem[];
  upcomingPool: TmdbListItem[];
  overrides: Movie[];
  posterCdnBase?: string;
  nowMin?: number;
  nowMax?: number;
  soonMin?: number;
  soonMax?: number;
  seed?: number;
  limitNow?: boolean;
  limitSoon?: boolean;
};

function manualMovies(overrides: Movie[]): Movie[] {
  return overrides.filter(
    (m) => !m.tmdbId && !m.isArchived && m.id && !/^\d+$/.test(m.id)
  );
}

function buildCatalogPools(input: BuildCatalogInput): {
  nowPool: CatalogMovie[];
  soonPool: CatalogMovie[];
} {
  const omap = overrideById(input.overrides);
  const posterCdnBase = input.posterCdnBase;
  const nowPool: CatalogMovie[] = [];
  const soonPool: CatalogMovie[] = [];
  const seen = new Set<string>();

  const pushNow = (item: CatalogMovie) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    if (catalogHasPoster(item) && catalogIsNowShowing(item)) nowPool.push(item);
  };

  const pushSoon = (item: CatalogMovie) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    if (catalogHasPoster(item) && !catalogIsNowShowing(item)) soonPool.push(item);
  };

  for (const t of input.nowPlayingPool) {
    const o = omap.get(String(t.id));
    if (o?.isArchived) continue;
    if (!tmdbItemHasPoster(t, o, posterCdnBase)) continue;
    const item = mergeTmdbWithOverride(t, o, posterCdnBase);
    if (tmdbHasStars(t)) pushNow(item);
    else pushSoon(item);
  }

  for (const t of input.upcomingPool) {
    const o = omap.get(String(t.id));
    if (o?.isArchived) continue;
    if (!tmdbItemHasPoster(t, o, posterCdnBase)) continue;
    const item = mergeTmdbWithOverride(t, o, posterCdnBase);
    if (tmdbHasStars(t)) pushNow(item);
    else pushSoon(item);
  }

  for (const m of manualMovies(input.overrides)) {
    if (!manualMovieHasPoster(m, posterCdnBase)) continue;
    pushSoon(manualToCatalog(m, posterCdnBase));
  }

  return { nowPool, soonPool };
}

export function buildPublicCatalog(input: BuildCatalogInput): {
  nowShowing: CatalogMovie[];
  comingSoon: CatalogMovie[];
} {
  const seed = input.seed ?? dailyCatalogSeed();
  const { nowPool, soonPool } = buildCatalogPools(input);

  const nowCount = pickCount(seed, input.nowMin ?? 20, input.nowMax ?? 25);
  const nowShowing = takeFirst(nowPool, nowCount);
  const nowIds = new Set(nowShowing.map((m) => m.id));

  const soonFiltered = soonPool.filter((m) => !nowIds.has(m.id));
  const soonCount = pickCount(seed + 1, input.soonMin ?? 5, input.soonMax ?? 10);
  const comingSoon = takeFirst(soonFiltered, soonCount);

  return { nowShowing, comingSoon };
}

export function buildAdminCatalog(input: {
  nowPlayingPool: TmdbListItem[];
  upcomingPool: TmdbListItem[];
  overrides: Movie[];
  posterCdnBase?: string;
  archivedOnly?: boolean;
}): { nowShowing: CatalogMovie[]; comingSoon: CatalogMovie[] } {
  if (input.archivedOnly) {
    const archived = input.overrides
      .filter((m) => m.isArchived)
      .map((m) => manualToCatalog(m, input.posterCdnBase));
    return { nowShowing: [], comingSoon: archived };
  }

  const { nowPool, soonPool } = buildCatalogPools({
    ...input,
    limitNow: false,
    limitSoon: false,
  });
  return { nowShowing: nowPool, comingSoon: soonPool };
}

export function catalogForTab(
  catalog: { nowShowing: CatalogMovie[]; comingSoon: CatalogMovie[] },
  tab: string | null | undefined
): CatalogMovie[] {
  if (tab === "soon" || tab === "advance") return catalog.comingSoon;
  return catalog.nowShowing;
}
