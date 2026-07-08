import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  DeleteCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { AdminSettings, Booking, Cinema, Movie, Screen, Showtime, Ticket } from "../../../shared/types";
import { isMovieVisibleToPublic } from "../../../shared/movieHelpers";
import { buildRevenueReport } from "../../../shared/reports";
import { buildMovieFromTmdb, normalizeAdminSettings, normalizeMovieInput } from "./movieAdmin";
import { seedCinemas, seedMovies, seedScreens, seedShowtimes } from "./seed";
import {
  generateShowtimes,
  hasDistinctSlotTimes,
  randomCleanupMin,
  randomShowtimeCount,
} from "./showtimeSchedule";
import { fetchTmdbRuntime, getCachedRuntime } from "./tmdb";
import { isShowtimeBookable, SHOWTIME_CLOSED_MSG } from "../../../shared/showtimeCutoff";
import { type DailySchedule, vnDayKey, showtimeMovieId } from "../../../shared/dailySchedule";

const TABLE = process.env.STORE_TABLE_NAME ?? "";
const POSTER_BUCKET = process.env.POSTER_BUCKET_NAME ?? "";
const POSTER_CDN_BASE = process.env.POSTER_CDN_BASE ?? "";
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const PK = {
  META: "META",
  CINEMA: "CINEMA",
  SCREEN: "SCREEN",
  MOVIE: "MOVIE",
  SHOWTIME: "SHOWTIME",
  BOOKING: "BOOKING",
  TICKET: "TICKET",
  LOCK: "LOCK",
} as const;

type SeatLock = { showtimeId: string; seat: string; userId: string; expiresAt: number };

export type EnrichedShowtime = Showtime & {
  movieTitle: string;
  movieDuration: number;
  screenName: string;
  cinemaName: string;
  rows: number;
  cols: number;
};

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function seatKey(showtimeId: string, seat: string) {
  return `${showtimeId}#${seat}`;
}

async function getItem<T>(pk: string, sk: string): Promise<T | null> {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { pk, sk } }));
  return (res.Item?.data as T) ?? null;
}

async function putItem(pk: string, sk: string, data: unknown, extra?: Record<string, unknown>) {
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: { pk, sk, data, ...extra },
    })
  );
}

async function listByPk<T>(pk: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ExclusiveStartKey: lastKey,
      })
    );
    for (const item of res.Items ?? []) {
      items.push(item.data as T);
    }
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function deleteByPkSk(pk: string, sk: string) {
  await doc.send(new DeleteCommand({ TableName: TABLE, Key: { pk, sk } }));
}

export async function ensureSeeded() {
  const meta = await getItem<{ seeded: boolean }>(PK.META, "SEEDED");
  if (meta?.seeded) return;

  const writes = [
    ...seedCinemas.map((c) => ({ pk: PK.CINEMA, sk: c.id, data: c })),
    ...seedScreens.map((s) => ({ pk: PK.SCREEN, sk: s.id, data: s })),
    ...seedMovies.map((m) => ({ pk: PK.MOVIE, sk: m.id, data: m })),
    ...seedShowtimes.map((s) => ({ pk: PK.SHOWTIME, sk: s.id, data: s, movieId: s.movieId })),
    { pk: PK.META, sk: "SEEDED", data: { seeded: true } },
  ];

  for (let i = 0; i < writes.length; i += 25) {
    const batch = writes.slice(i, i + 25);
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: batch.map((w) => ({
            PutRequest: { Item: w },
          })),
        },
      })
    );
  }
}

export async function listMovies(opts?: { includeArchived?: boolean; status?: string }): Promise<Movie[]> {
  await ensureSeeded();
  let items = await listByPk<Movie>(PK.MOVIE);
  if (!opts?.includeArchived) {
    items = items.filter(isMovieVisibleToPublic);
  }
  if (opts?.status) {
    items = items.filter((m) => m.status === opts.status);
  }
  return items;
}

export async function getMovie(id: string): Promise<Movie | null> {
  await ensureSeeded();
  return getItem<Movie>(PK.MOVIE, id);
}

export async function listCinemas(): Promise<Cinema[]> {
  await ensureSeeded();
  return listByPk<Cinema>(PK.CINEMA);
}

export async function listScreens(): Promise<Screen[]> {
  await ensureSeeded();
  return listByPk<Screen>(PK.SCREEN);
}

export async function enrichShowtime(st: Showtime): Promise<EnrichedShowtime> {
  const [movies, screens, cinemas] = await Promise.all([listMovies(), listScreens(), listCinemas()]);
  const movie = movies.find((m) => m.id === st.movieId);
  const screen = screens.find((s) => s.id === st.screenId);
  const cinema = screen ? cinemas.find((c) => c.id === screen.cinemaId) : undefined;
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

function isFutureShowtime(st: Showtime) {
  return isShowtimeBookable(st.startsAt);
}

async function requireBookableShowtime(showtimeId: string): Promise<Showtime> {
  await ensureSeeded();
  let st = await getItem<Showtime>(PK.SHOWTIME, showtimeId);
  if (!st && showtimeId.startsWith("st-")) {
    const movieId = showtimeMovieId(showtimeId);
    if (movieId) await ensureShowtimesForMovie(movieId);
    st = await getItem<Showtime>(PK.SHOWTIME, showtimeId);
  }
  if (!st || !isShowtimeBookable(st.startsAt)) {
    throw new Error(SHOWTIME_CLOSED_MSG);
  }
  return st;
}

export async function getDailySchedule(): Promise<DailySchedule> {
  return { day: vnDayKey(), movieId: "" };
}

function durationForMovie(movieId: string, movies: Movie[], fallback: number) {
  const movie = movies.find((m) => m.id === movieId);
  return movie?.durationMin ?? getCachedRuntime(movieId) ?? fallback;
}

export async function ensureShowtimesForMovie(
  movieId: string,
  opts?: { cinemaId?: string; date?: string }
): Promise<Showtime[]> {
  await ensureSeeded();
  const targetDate = opts?.date ?? vnDayKey();
  const all = await listByPk<Showtime>(PK.SHOWTIME);
  const onDay = all.filter(
    (s) => s.movieId === movieId && s.startsAt.startsWith(targetDate)
  );
  const bookable = onDay.filter((s) => isShowtimeBookable(s.startsAt));

  if (bookable.length >= 3 && bookable.length <= 5 && hasDistinctSlotTimes(bookable)) {
    return bookable;
  }

  for (const st of onDay) {
    await deleteByPkSk(PK.SHOWTIME, st.id);
  }

  const [screens, movies, remaining] = await Promise.all([
    listScreens(),
    listMovies(),
    listByPk<Showtime>(PK.SHOWTIME),
  ]);

  const durationMin = await fetchTmdbRuntime(movieId);
  const cleanupMin = randomCleanupMin();
  const count = randomShowtimeCount();

  const existingOnScreens = remaining.map((s) => ({
    screenId: s.screenId,
    startsAt: s.startsAt,
    durationMin: durationForMovie(s.movieId, movies, 120),
    cleanupMin: randomCleanupMin(),
  }));

  const created = generateShowtimes({
    movieId,
    durationMin,
    cleanupMin,
    screens,
    count,
    existingOnScreens,
    cinemaId: opts?.cinemaId,
    preferDate: targetDate,
  });

  for (const st of created) {
    await putItem(PK.SHOWTIME, st.id, st, { movieId: st.movieId });
  }
  return created;
}

export async function listShowtimes(filters: {
  movieId?: string;
  date?: string;
  cinema?: string;
}): Promise<{ items: EnrichedShowtime[]; schedule: DailySchedule }> {
  const day = filters.date ?? vnDayKey();
  const schedule: DailySchedule = { day, movieId: filters.movieId ?? "" };

  if (filters.movieId) {
    await ensureShowtimesForMovie(filters.movieId, {
      cinemaId: filters.cinema,
      date: day,
    });
  } else {
    await ensureSeeded();
  }

  const [all, screens] = await Promise.all([listByPk<Showtime>(PK.SHOWTIME), listScreens()]);
  let items = all.filter((s) => isFutureShowtime(s));
  if (filters.movieId) items = items.filter((s) => s.movieId === filters.movieId);
  items = items.filter((s) => s.startsAt.startsWith(day));
  if (filters.cinema) {
    items = items.filter((s) => {
      const screen = screens.find((sc) => sc.id === s.screenId);
      return screen?.cinemaId === filters.cinema;
    });
  }

  const enriched = await Promise.all(items.map(enrichShowtime));
  return { items: enriched, schedule };
}

export async function getShowtime(id: string): Promise<EnrichedShowtime | null> {
  await ensureSeeded();
  let st = await getItem<Showtime>(PK.SHOWTIME, id);
  if (!st && id.startsWith("st-")) {
    const movieId = showtimeMovieId(id);
    if (movieId) {
      await ensureShowtimesForMovie(movieId);
      st = await getItem<Showtime>(PK.SHOWTIME, id);
    }
  }
  if (!st || !isShowtimeBookable(st.startsAt)) return null;
  return enrichShowtime(st);
}

export async function cleanupLocks() {
  const now = Date.now();
  const locks = await listByPk<SeatLock & { pk?: string; sk?: string }>(PK.LOCK);
  for (const lock of locks) {
    if (lock.expiresAt < now) {
      await deleteByPkSk(PK.LOCK, seatKey(lock.showtimeId, lock.seat));
    }
  }
}

export async function getSeats(showtimeId: string, userId?: string) {
  const st = await getShowtime(showtimeId);
  if (!st) return null;

  await cleanupLocks();
  const [locks, bookings] = await Promise.all([listByPk<SeatLock>(PK.LOCK), listBookings()]);
  const now = Date.now();
  const activeLocks = locks.filter((l) => l.showtimeId === showtimeId && l.expiresAt > now);
  const locked = activeLocks
    .filter((l) => !userId || l.userId !== userId)
    .map((l) => l.seat);
  const myLocked = userId
    ? activeLocks.filter((l) => l.userId === userId).map((l) => l.seat)
    : [];

  const showtimeBookings = bookings.filter(
    (b) => b.showtimeId === showtimeId && b.status !== "CANCELLED"
  );
  const booked = showtimeBookings
    .filter(
      (b) =>
        b.status === "CONFIRMED" ||
        b.status === "PAID" ||
        (b.status === "PENDING" && b.userId !== userId)
    )
    .flatMap((b) => b.seats);

  const myPending = userId
    ? showtimeBookings.find((b) => b.userId === userId && b.status === "PENDING")
    : undefined;
  const myPendingSeats = myPending?.seats ?? [];

  return {
    rows: st.rows,
    cols: st.cols,
    locked,
    booked,
    myLocked,
    myPendingSeats,
    pendingBookingId: myPending?.id,
  };
}

export async function lockSeats(showtimeId: string, seats: string[], userId: string) {
  await requireBookableShowtime(showtimeId);
  await cleanupLocks();
  const ttl = 5 * 60 * 1000;
  const t = Date.now();

  for (const seat of seats) {
    const sk = seatKey(showtimeId, seat);
    const existing = await getItem<SeatLock>(PK.LOCK, sk);
    if (existing && existing.userId !== userId && existing.expiresAt > t) {
      throw new Error(`Seat ${seat} locked`);
    }
  }

  for (const seat of seats) {
    const sk = seatKey(showtimeId, seat);
    await putItem(
      PK.LOCK,
      sk,
      { showtimeId, seat, userId, expiresAt: t + ttl },
      { ttl: Math.floor((t + ttl) / 1000) }
    );
  }
  return { locked: seats, expiresInSec: 300 };
}

export async function releaseSeats(showtimeId: string, userId: string, seats?: string[]) {
  await cleanupLocks();
  const locks = await listByPk<SeatLock>(PK.LOCK);
  const now = Date.now();
  const targetSeats = seats?.length
    ? new Set(seats)
    : null;

  for (const lock of locks) {
    if (lock.showtimeId !== showtimeId || lock.userId !== userId || lock.expiresAt <= now) {
      continue;
    }
    if (targetSeats && !targetSeats.has(lock.seat)) continue;
    await deleteByPkSk(PK.LOCK, seatKey(showtimeId, lock.seat));
  }

  const pending = await findPendingBooking(userId, showtimeId);
  if (pending) {
    const pendingSeats = new Set(pending.seats);
    const shouldCancel =
      !targetSeats || pending.seats.every((seat) => targetSeats.has(seat));
    if (shouldCancel) await cancelPendingBooking(pending.id);
  }

  return { released: true };
}

export async function getBooking(bookingId: string) {
  return getItem<Booking>(PK.BOOKING, bookingId);
}

export async function cancelPendingBooking(bookingId: string) {
  const booking = await getItem<Booking>(PK.BOOKING, bookingId);
  if (!booking || booking.status !== "PENDING") return null;
  await putItem(PK.BOOKING, bookingId, { ...booking, status: "CANCELLED" });
  return booking;
}

export async function findPendingBooking(
  userId: string,
  showtimeId: string
): Promise<Booking | null> {
  const bookings = await listBookings();
  return (
    bookings.find(
      (b) => b.userId === userId && b.showtimeId === showtimeId && b.status === "PENDING"
    ) ?? null
  );
}

function sameSeats(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((s, i) => s === sb[i]);
}

export async function resumeOrCreatePendingBooking(input: {
  showtimeId: string;
  userId: string;
  seats: string[];
  totalAmount: number;
}): Promise<{ bookingId: string; ticketId: string; resumed: boolean }> {
  const existing = await findPendingBooking(input.userId, input.showtimeId);
  if (existing) {
    if (sameSeats(existing.seats, input.seats)) {
      const tickets = await listByPk<Ticket>(PK.TICKET);
      const ticket = tickets.find((t) => t.bookingId === existing.id);
      return {
        bookingId: existing.id,
        ticketId: ticket?.id ?? "",
        resumed: true,
      };
    }
    await cancelPendingBooking(existing.id);
  }

  const bookingId = createId("bk");
  const created = await createPendingBooking({
    bookingId,
    showtimeId: input.showtimeId,
    userId: input.userId,
    seats: input.seats,
    totalAmount: input.totalAmount,
  });
  return { bookingId: created.bookingId, ticketId: created.ticketId, resumed: false };
}

export async function createPendingBooking(input: {
  bookingId: string;
  showtimeId: string;
  userId: string;
  seats: string[];
  totalAmount: number;
}) {
  await requireBookableShowtime(input.showtimeId);
  const ticketId = createId("tk");
  const qrCode = `TICKET:${ticketId}:${input.bookingId}`;
  const createdAt = new Date().toISOString();

  const booking: Booking = {
    id: input.bookingId,
    showtimeId: input.showtimeId,
    userId: input.userId,
    seats: input.seats,
    status: "PENDING",
    totalAmount: input.totalAmount,
    createdAt,
  };

  const ticket: Ticket = { id: ticketId, bookingId: input.bookingId, qrCode };

  await putItem(PK.BOOKING, input.bookingId, booking);
  await putItem(PK.TICKET, ticketId, ticket, { bookingId: input.bookingId });

  return { bookingId: input.bookingId, ticketId, status: "PENDING" as const, qrCode };
}

export async function finalizeBookingAfterPayment(bookingId: string) {
  const booking = await getItem<Booking>(PK.BOOKING, bookingId);
  if (!booking) return null;
  if (booking.status === "CONFIRMED" || booking.status === "PAID") {
    const tickets = await listByPk<Ticket>(PK.TICKET);
    const ticket = tickets.find((t) => t.bookingId === bookingId);
    return {
      bookingId,
      ticketId: ticket?.id ?? "",
      status: booking.status,
      qrCode: ticket?.qrCode ?? "",
    };
  }
  if (booking.status !== "PENDING") return null;

  const updated: Booking = { ...booking, status: "CONFIRMED" };
  await putItem(PK.BOOKING, bookingId, updated);

  for (const seat of booking.seats) {
    await deleteByPkSk(PK.LOCK, seatKey(booking.showtimeId, seat));
  }

  const tickets = await listByPk<Ticket>(PK.TICKET);
  const ticket = tickets.find((t) => t.bookingId === bookingId);

  return {
    bookingId,
    ticketId: ticket?.id ?? "",
    status: "CONFIRMED" as const,
    qrCode: ticket?.qrCode ?? "",
  };
}

export async function createBooking(input: {
  bookingId: string;
  showtimeId: string;
  userId: string;
  seats: string[];
  totalAmount: number;
}) {
  await requireBookableShowtime(input.showtimeId);
  const bookingId = input.bookingId;
  const ticketId = createId("tk");
  const qrCode = `TICKET:${ticketId}:${bookingId}`;
  const createdAt = new Date().toISOString();

  const booking: Booking = {
    id: bookingId,
    showtimeId: input.showtimeId,
    userId: input.userId,
    seats: input.seats,
    status: "CONFIRMED",
    totalAmount: input.totalAmount,
    createdAt,
  };

  const ticket: Ticket = { id: ticketId, bookingId, qrCode };

  await putItem(PK.BOOKING, bookingId, booking);
  await putItem(PK.TICKET, ticketId, ticket, { bookingId });

  for (const seat of input.seats) {
    await deleteByPkSk(PK.LOCK, seatKey(input.showtimeId, seat));
  }

  return { bookingId, ticketId, status: "CONFIRMED" as const, qrCode };
}

export async function confirmBooking(bookingId: string) {
  const booking = await getItem<Booking>(PK.BOOKING, bookingId);
  if (!booking) return null;
  if (booking.status === "CONFIRMED") return booking;
  const updated = { ...booking, status: "CONFIRMED" as const };
  await putItem(PK.BOOKING, bookingId, updated);
  return updated;
}

export async function listBookings(): Promise<Booking[]> {
  await ensureSeeded();
  return listByPk<Booking>(PK.BOOKING);
}

export async function getTicket(id: string): Promise<{ ticket: Ticket; booking: Booking | null } | null> {
  let ticket = await getItem<Ticket>(PK.TICKET, id);
  if (!ticket) {
    const all = await listByPk<Ticket>(PK.TICKET);
    ticket = all.find((t) => t.bookingId === id) ?? null;
  }
  if (!ticket) return null;
  const booking = await getItem<Booking>(PK.BOOKING, ticket.bookingId);
  return { ticket, booking };
}

export async function createMovie(body: Record<string, unknown>): Promise<Movie> {
  const movie = normalizeMovieInput(body);
  await putItem(PK.MOVIE, movie.id, movie);
  return movie;
}

export async function updateMovie(id: string, body: Record<string, unknown>): Promise<Movie | null> {
  const existing = await getMovie(id);
  if (!existing) return null;
  const movie = normalizeMovieInput({ ...existing, ...body, id }, existing);
  await putItem(PK.MOVIE, id, movie);
  return movie;
}

export async function upsertMovie(id: string, body: Record<string, unknown>): Promise<Movie> {
  const existing = await getMovie(id);
  if (existing) {
    const movie = normalizeMovieInput({ ...existing, ...body, id }, existing);
    await putItem(PK.MOVIE, id, movie);
    return movie;
  }
  const tmdbId = /^\d+$/.test(id) ? Number(id) : body.tmdbId != null ? Number(body.tmdbId) : undefined;
  const movie = normalizeMovieInput({ ...body, id, tmdbId }, undefined);
  await putItem(PK.MOVIE, id, movie);
  return movie;
}

export async function archiveMovie(id: string): Promise<Movie | null> {
  let existing = await getMovie(id);
  if (!existing) {
    if (!/^\d+$/.test(id)) return null;
    existing = normalizeMovieInput({
      id,
      tmdbId: Number(id),
      title: `TMDB #${id}`,
      description: "",
      durationMin: 120,
      status: "NOW_SHOWING",
    });
  }
  const allShowtimes = await listByPk<Showtime>(PK.SHOWTIME);
  const hasFuture = allShowtimes.some(
    (s) => s.movieId === id && isShowtimeBookable(s.startsAt)
  );
  if (hasFuture) {
    throw new Error("Cannot archive movie with upcoming showtimes");
  }
  const movie: Movie = {
    ...existing,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putItem(PK.MOVIE, id, movie);
  return movie;
}

export async function importMovieFromTmdb(tmdbId: number): Promise<Movie> {
  const id = String(tmdbId);
  const existing = await getMovie(id);
  const movie = await buildMovieFromTmdb(tmdbId, existing ?? undefined);
  await putItem(PK.MOVIE, movie.id, movie);
  return movie;
}

export async function uploadMoviePoster(
  id: string,
  dataBase64: string,
  contentType: string
): Promise<Movie | null> {
  let existing = await getMovie(id);
  if (!existing && /^\d+$/.test(id)) {
    existing = normalizeMovieInput({
      id,
      tmdbId: Number(id),
      title: `TMDB #${id}`,
      description: "",
      durationMin: 120,
      status: "NOW_SHOWING",
    });
    await putItem(PK.MOVIE, id, existing);
  }
  if (!existing) return null;

  const buffer = Buffer.from(dataBase64, "base64");
  const ext = contentType.includes("png") ? "png" : "jpg";
  const key = `posters/${id}/${Date.now()}.${ext}`;

  if (POSTER_BUCKET) {
    await s3.send(
      new PutObjectCommand({
        Bucket: POSTER_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const posterUrl = POSTER_CDN_BASE
      ? `${POSTER_CDN_BASE.replace(/\/$/, "")}/${key}`
      : `https://${POSTER_BUCKET}.s3.amazonaws.com/${key}`;
    const locked = new Set(existing.lockedFields ?? []);
    if (!locked.has("posterUrl")) {
      return (await updateMovie(id, { posterUrl, posterS3Key: key })) ?? null;
    }
    return (await updateMovie(id, { posterS3Key: key })) ?? null;
  }

  const posterUrl = `data:${contentType};base64,${dataBase64}`;
  return (await updateMovie(id, { posterUrl, posterS3Key: key })) ?? null;
}

export async function listShowtimesAdmin(): Promise<EnrichedShowtime[]> {
  await ensureSeeded();
  const all = await listByPk<Showtime>(PK.SHOWTIME);
  return Promise.all(all.map(enrichShowtime));
}

export async function updateShowtime(
  id: string,
  body: Record<string, unknown>
): Promise<EnrichedShowtime | null> {
  const existing = await getItem<Showtime>(PK.SHOWTIME, id);
  if (!existing) return null;
  const st: Showtime = {
    ...existing,
    movieId: body.movieId != null ? String(body.movieId) : existing.movieId,
    screenId: body.screenId != null ? String(body.screenId) : existing.screenId,
    startsAt: body.startsAt != null ? String(body.startsAt) : existing.startsAt,
    price: body.price != null ? Number(body.price) : existing.price,
    isSpecial: body.isSpecial != null ? Boolean(body.isSpecial) : existing.isSpecial,
  };
  await putItem(PK.SHOWTIME, id, st, { movieId: st.movieId });
  return enrichShowtime(st);
}

export async function deleteShowtime(id: string): Promise<boolean> {
  const existing = await getItem<Showtime>(PK.SHOWTIME, id);
  if (!existing) return false;
  await deleteByPkSk(PK.SHOWTIME, id);
  return true;
}

export async function getRevenueReport(query: {
  from?: string;
  to?: string;
  groupBy?: string;
}): Promise<import("../../../shared/types").RevenueReport> {
  const to = query.to ?? vnDayKey();
  const from = query.from ?? to;
  const groupBy = query.groupBy === "week" || query.groupBy === "month" ? query.groupBy : "day";

  const [bookings, showtimes, screens, cinemas, movies] = await Promise.all([
    listBookings(),
    listByPk<Showtime>(PK.SHOWTIME),
    listScreens(),
    listCinemas(),
    listByPk<Movie>(PK.MOVIE),
  ]);

  return buildRevenueReport({
    bookings,
    showtimes,
    screens,
    cinemas,
    movies,
    from,
    to,
    groupBy,
  });
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const settings = await getItem<AdminSettings>(PK.META, "ADMIN_SETTINGS");
  return settings ?? {};
}

export async function saveAdminSettings(body: Record<string, unknown>): Promise<AdminSettings> {
  const existing = await getAdminSettings();
  const settings = normalizeAdminSettings(body, existing);
  await putItem(PK.META, "ADMIN_SETTINGS", settings);
  return settings;
}

export async function createShowtime(body: Record<string, unknown>): Promise<EnrichedShowtime> {
  const st: Showtime = {
    id: createId("s"),
    movieId: String(body.movieId ?? ""),
    screenId: String(body.screenId ?? ""),
    startsAt: String(body.startsAt ?? ""),
    price: Number(body.price ?? 10),
    isSpecial: Boolean(body.isSpecial ?? false),
  };
  await putItem(PK.SHOWTIME, st.id, st, { movieId: st.movieId });
  return enrichShowtime(st);
}

export function getPosterCdnBase() {
  return POSTER_CDN_BASE;
}

export { createId, SHOWTIME_CLOSED_MSG };
