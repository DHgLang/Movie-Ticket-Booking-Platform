import type {
  Booking,
  Cinema,
  GiftCard,
  GiftCardTransaction,
  Movie,
  PaymentResult,
  Screen,
  SeatLock,
  Showtime,
  Ticket,
  Voucher,
} from "../../../shared/types.ts";
import {
  generateShowtimes,
  hasDistinctSlotTimes,
  randomCleanupMin,
  randomShowtimeCount,
} from "./showtimeSchedule.ts";
import { fetchTmdbRuntime, getCachedRuntime } from "./tmdbServer.ts";
import { cinemaLocations } from "../data/cinemas.ts";
import { isShowtimeBookable, SHOWTIME_CLOSED_MSG } from "../../../shared/showtimeCutoff.ts";
import { vnDayKey } from "../../../shared/dailySchedule.ts";

const now = () => new Date().toISOString();

export const db = {
  movies: [
    {
      id: "m1",
      title: "Dune: Part Three",
      description: "Paul Atreides faces the ultimate war across the galaxy.",
      durationMin: 155,
      rating: "PG-13",
      genre: "Sci-Fi",
      status: "NOW_SHOWING",
      distributorSharePct: 50,
      posterUrl: "",
    },
    {
      id: "m2",
      title: "Inside Out 3",
      description: "New emotions arrive as Riley enters college.",
      durationMin: 98,
      rating: "G",
      genre: "Animation",
      status: "NOW_SHOWING",
      distributorSharePct: 45,
      posterUrl: "",
    },
    {
      id: "m3",
      title: "Mission Impossible 9",
      description: "Ethan Hunt's most dangerous mission yet.",
      durationMin: 142,
      rating: "PG-13",
      genre: "Action",
      status: "SPECIAL",
      distributorSharePct: 55,
      posterUrl: "",
    },
    {
      id: "m4",
      title: "The Batman: New Order",
      description: "Gotham under siege from a new criminal syndicate.",
      durationMin: 128,
      rating: "PG-13",
      genre: "Action",
      status: "COMING_SOON",
      releaseDate: "2026-08-01",
      distributorSharePct: 50,
      posterUrl: "",
    },
  ] as Movie[],

  cinemas: cinemaLocations.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    city: c.city,
  })) as Cinema[],

  screens: [
    { id: "sc1", cinemaId: "c1", name: "Screen 1 - IMAX", rows: 8, cols: 12 },
    { id: "sc2", cinemaId: "c1", name: "Screen 2", rows: 6, cols: 10 },
    { id: "sc3", cinemaId: "c2", name: "Screen A - ScreenX", rows: 7, cols: 9 },
    { id: "sc4", cinemaId: "c3", name: "Screen 1 - Super Plex", rows: 8, cols: 10 },
    { id: "sc5", cinemaId: "c4", name: "Screen 1 - Gold Class", rows: 6, cols: 8 },
  ] as Screen[],

  showtimes: [] as Showtime[],

  bookings: [] as Booking[],
  tickets: [] as Ticket[],
  locks: new Map<string, SeatLock>(),
  payments: [] as PaymentResult[],
  vouchers: [
    {
      code: "TUESDAY10",
      name: "Tuesday 10% Off",
      discountType: "PERCENT",
      value: 10,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      code: "FAMILY4",
      name: "Family Pack Discount",
      discountType: "FIXED",
      value: 4,
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2027-12-31T23:59:59.000Z",
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    },
  ] as Voucher[],
  giftCards: [
    {
      code: "GIFT100",
      balance: 100,
      status: "ACTIVE",
      issuedBy: "admin-seed",
      note: "Demo gift card",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      code: "GIFT25",
      balance: 25,
      status: "ACTIVE",
      issuedBy: "admin-seed",
      note: "Small demo balance",
      createdAt: now(),
      updatedAt: now(),
    },
  ] as GiftCard[],
  giftCardTxs: [
    {
      id: "gtx_seed1",
      giftCardCode: "GIFT100",
      amount: 100,
      type: "ISSUE",
      actor: "admin-seed",
      note: "Initial issue",
      createdAt: now(),
    },
    {
      id: "gtx_seed2",
      giftCardCode: "GIFT25",
      amount: 25,
      type: "ISSUE",
      actor: "admin-seed",
      note: "Initial issue",
      createdAt: now(),
    },
  ] as GiftCardTransaction[],
};

export function seatKey(showtimeId: string, seat: string) {
  return `${showtimeId}:${seat}`;
}

export function enrichShowtime(st: Showtime) {
  const movie = db.movies.find((m) => m.id === st.movieId);
  const screen = db.screens.find((s) => s.id === st.screenId);
  const cinema = screen ? db.cinemas.find((c) => c.id === screen.cinemaId) : undefined;
  const cachedRuntime = getCachedRuntime(st.movieId);
  return {
    ...st,
    movieTitle: movie?.title ?? `TMDB #${st.movieId}`,
    movieDuration: movie?.durationMin ?? cachedRuntime ?? 120,
    screenName: screen?.name ?? "Unknown",
    cinemaName: cinema?.name ?? "Unknown",
    rows: screen?.rows ?? 8,
    cols: screen?.cols ?? 10,
  };
}

export function cleanupLocks() {
  const t = Date.now();
  for (const [k, v] of db.locks) {
    if (v.expiresAt < t) db.locks.delete(k);
  }
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function requireBookableShowtime(showtimeId: string): Showtime {
  const st = db.showtimes.find((s) => s.id === showtimeId);
  if (!st || !isShowtimeBookable(st.startsAt)) {
    throw new Error(SHOWTIME_CLOSED_MSG);
  }
  return st;
}

export { SHOWTIME_CLOSED_MSG };

function durationForMovie(movieId: string, fallback: number) {
  const movie = db.movies.find((m) => m.id === movieId);
  return movie?.durationMin ?? getCachedRuntime(movieId) ?? fallback;
}

/** Auto-generate 3–5 showtimes per day for a TMDB movie id. */
export async function ensureShowtimesForMovie(
  movieId: string,
  opts?: { cinemaId?: string; date?: string }
) {
  const targetDate = opts?.date ?? vnDayKey();
  const onDay = db.showtimes.filter(
    (s) => s.movieId === movieId && s.startsAt.startsWith(targetDate)
  );
  const bookable = onDay.filter((s) => isShowtimeBookable(s.startsAt));

  if (bookable.length >= 3 && bookable.length <= 5 && hasDistinctSlotTimes(bookable)) {
    return bookable;
  }

  db.showtimes = db.showtimes.filter(
    (s) => !(s.movieId === movieId && s.startsAt.startsWith(targetDate))
  );

  const durationMin = await fetchTmdbRuntime(movieId);
  const cleanupMin = randomCleanupMin();
  const count = randomShowtimeCount();

  const existingOnScreens = db.showtimes.map((s) => ({
    screenId: s.screenId,
    startsAt: s.startsAt,
    durationMin: durationForMovie(s.movieId, 120),
    cleanupMin: randomCleanupMin(),
  }));

  const created = generateShowtimes({
    movieId,
    durationMin,
    cleanupMin,
    screens: db.screens,
    count,
    existingOnScreens,
    cinemaId: opts?.cinemaId,
    preferDate: targetDate,
  });

  db.showtimes.push(...created);
  return created;
}

export { now };
