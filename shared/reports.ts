import type {
  Booking,
  Cinema,
  Movie,
  RevenueReport,
  Screen,
  Showtime,
} from "./types";

const REVENUE_STATUSES = new Set(["PAID", "CONFIRMED"]);

function parseDay(iso: string) {
  return iso.slice(0, 10);
}

function weekKey(day: string) {
  const d = new Date(`${day}T12:00:00`);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function monthKey(day: string) {
  return day.slice(0, 7);
}

function periodKey(day: string, groupBy: "day" | "week" | "month") {
  if (groupBy === "week") return weekKey(day);
  if (groupBy === "month") return monthKey(day);
  return day;
}

export function buildRevenueReport(input: {
  bookings: Booking[];
  showtimes: Showtime[];
  screens: Screen[];
  cinemas: Cinema[];
  movies: Movie[];
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
}): RevenueReport {
  const showtimeMap = new Map(input.showtimes.map((s) => [s.id, s]));
  const screenMap = new Map(input.screens.map((s) => [s.id, s]));
  const cinemaMap = new Map(input.cinemas.map((c) => [c.id, c]));
  const movieMap = new Map(input.movies.map((m) => [m.id, m]));

  const inRange = input.bookings.filter((b) => {
    if (!REVENUE_STATUSES.has(b.status)) return false;
    const day = parseDay(b.createdAt);
    return day >= input.from && day <= input.to;
  });

  const byPeriodMap = new Map<string, RevenueReport["byPeriod"][0]>();
  const byMovieMap = new Map<string, RevenueReport["byMovie"][0]>();
  const byCinemaMap = new Map<string, RevenueReport["byCinema"][0]>();

  let total = 0;
  let tickets = 0;

  for (const booking of inRange) {
    const amount = booking.totalAmount;
    const seatCount = booking.seats.length;
    total += amount;
    tickets += seatCount;

    const day = parseDay(booking.createdAt);
    const pk = periodKey(day, input.groupBy);
    const periodRow = byPeriodMap.get(pk) ?? { period: pk, total: 0, bookings: 0, tickets: 0 };
    periodRow.total += amount;
    periodRow.bookings += 1;
    periodRow.tickets += seatCount;
    byPeriodMap.set(pk, periodRow);

    const showtime = showtimeMap.get(booking.showtimeId);
    const screen = showtime ? screenMap.get(showtime.screenId) : undefined;
    const cinema = screen ? cinemaMap.get(screen.cinemaId) : undefined;
    const movie = showtime ? movieMap.get(showtime.movieId) : undefined;

    const movieId = movie?.id ?? showtime?.movieId ?? "unknown";
    const movieTitle = movie?.title ?? `Movie ${movieId}`;
    const sharePct = movie?.distributorSharePct ?? 0;
    const movieRow = byMovieMap.get(movieId) ?? {
      movieId,
      movieTitle,
      total: 0,
      tickets: 0,
      sharePct,
      distributorAmount: 0,
    };
    movieRow.total += amount;
    movieRow.tickets += seatCount;
    movieRow.sharePct = sharePct;
    movieRow.distributorAmount = (movieRow.total * sharePct) / 100;
    byMovieMap.set(movieId, movieRow);

    const cinemaId = cinema?.id ?? "unknown";
    const cinemaName = cinema?.name ?? "Unknown cinema";
    const cinemaRow = byCinemaMap.get(cinemaId) ?? {
      cinemaId,
      cinemaName,
      total: 0,
      bookings: 0,
      tickets: 0,
    };
    cinemaRow.total += amount;
    cinemaRow.bookings += 1;
    cinemaRow.tickets += seatCount;
    byCinemaMap.set(cinemaId, cinemaRow);
  }

  return {
    from: input.from,
    to: input.to,
    groupBy: input.groupBy,
    summary: { total, bookings: inRange.length, tickets },
    byPeriod: [...byPeriodMap.values()].sort((a, b) => a.period.localeCompare(b.period)),
    byMovie: [...byMovieMap.values()].sort((a, b) => b.total - a.total),
    byCinema: [...byCinemaMap.values()].sort((a, b) => b.total - a.total),
  };
}
