import type { IncomingMessage, ServerResponse } from "node:http";
import { cleanupLocks, createId, db, enrichShowtime, ensureShowtimesForMovie, now, seatKey, requireBookableShowtime, SHOWTIME_CLOSED_MSG } from "./mockStore.ts";
import { isShowtimeBookable } from "../../../shared/showtimeCutoff.ts";
import { vnDayKey, showtimeMovieId } from "../../../shared/dailySchedule.ts";
import { handleMockAdmin } from "./mockAdmin.ts";
import { isMovieVisibleToPublic } from "../../../shared/movieHelpers.ts";
import {
  activePromotions,
  applyGiftCardRedeem,
  findGiftCard,
  quoteCheckout,
  quoteHasBlockingErrors,
} from "./mockCommerce.ts";
import type { Booking, CheckoutQuote } from "../../../shared/types.ts";
import {
  buildVnpayPaymentUrl,
  getMockVnpay,
  isVnpaySuccess,
  usdToVnd,
  verifyVnpayCallback,
} from "./mockVnpay.ts";

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c: Buffer | string) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

type CheckoutResult =
  | { error: true; status: number; body: Record<string, unknown> }
  | { booking: Booking; ticketId: string; quote: CheckoutQuote };

/** Shared by VNPay + mock checkout: validate, quote, resume/create the pending booking. */
function createPendingCheckout(body: Record<string, unknown>): CheckoutResult {
  const { showtimeId, userId, seats, voucherCode, giftCardCode } = body as {
    showtimeId?: string;
    userId?: string;
    seats?: string[];
    voucherCode?: string;
    giftCardCode?: string;
  };
  if (!showtimeId || !userId || !seats?.length) {
    return { error: true, status: 400, body: { error: "showtimeId, userId, seats required" } };
  }
  try {
    requireBookableShowtime(showtimeId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Booking failed";
    return {
      error: true,
      status: msg === SHOWTIME_CLOSED_MSG ? 410 : 400,
      body: { error: msg },
    };
  }
  const showtime = db.showtimes.find((s) => s.id === showtimeId);
  if (!showtime) return { error: true, status: 404, body: { error: "Showtime not found" } };

  const subtotalAmount = Math.round(seats.length * showtime.price * 100) / 100;
  const quote = quoteCheckout({
    subtotalAmount,
    voucherCode,
    giftCardCode,
    seatCount: seats.length,
  });
  if (quoteHasBlockingErrors(quote)) {
    return {
      error: true,
      status: 400,
      body: {
        error:
          quote.voucherError?.message || quote.giftCardError?.message || "Invalid promo codes",
        quote,
      },
    };
  }

  const finalize = (booking: Booking) => {
    if (quote.finalAmount <= 0) {
      booking.status = "CONFIRMED";
      applyGiftCardRedeem(booking, booking.userId);
      for (const seat of booking.seats) db.locks.delete(seatKey(booking.showtimeId, seat));
    }
  };

  const existing = db.bookings.find(
    (b) => b.showtimeId === showtimeId && b.userId === userId && b.status === "PENDING"
  );
  if (existing) {
    const sameSeats =
      existing.seats.length === seats.length &&
      [...existing.seats].sort().every((s, i) => s === [...seats].sort()[i]);
    if (sameSeats) {
      Object.assign(existing, {
        subtotalAmount: quote.subtotalAmount,
        discountAmount: quote.discountAmount,
        giftCardAmount: quote.giftCardAmount,
        totalAmount: quote.finalAmount,
        voucherCode: quote.voucherCode,
        giftCardCode: quote.giftCardCode,
      });
      finalize(existing);
      const ticket = db.tickets.find((t) => t.bookingId === existing.id);
      return { booking: existing, ticketId: ticket?.id ?? "", quote };
    }
    existing.status = "CANCELLED";
  }

  const bookingId = createId("bk");
  const booking: Booking = {
    id: bookingId,
    showtimeId,
    userId,
    seats,
    status: "PENDING",
    totalAmount: quote.finalAmount,
    subtotalAmount: quote.subtotalAmount,
    discountAmount: quote.discountAmount,
    giftCardAmount: quote.giftCardAmount,
    voucherCode: quote.voucherCode,
    giftCardCode: quote.giftCardCode,
    createdAt: now(),
  };
  db.bookings.push(booking);
  const ticketId = createId("tk");
  db.tickets.push({ id: ticketId, bookingId, qrCode: `TICKET:${ticketId}:${bookingId}` });
  finalize(booking);
  return { booking, ticketId, quote };
}

export function mockApiMiddleware() {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    if (!req.url?.startsWith("/api")) return next();

    const url = new URL(req.url, "http://localhost");
    const path = url.pathname.replace(/^\/api/, "") || "/";
    const method = req.method ?? "GET";

    if (method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      return res.end();
    }

    cleanupLocks();

    // GET /health
    if (method === "GET" && path === "/health") {
      return json(res, 200, {
        ok: true,
        mode: "local-mock",
        vnpayEnabled: Boolean(getMockVnpay()),
      });
    }

    // GET /movies
    if (method === "GET" && path === "/movies/overrides") {
      return json(res, 200, { items: db.movies, posterCdnBase: "" });
    }

    if (method === "GET" && path === "/movies") {
      const includeArchived = url.searchParams.get("includeArchived") === "true";
      const items = includeArchived ? db.movies : db.movies.filter(isMovieVisibleToPublic);
      return json(res, 200, { items, posterCdnBase: "" });
    }

    // GET /movies/:id
    if (method === "GET" && path.startsWith("/movies/")) {
      const id = path.split("/")[2];
      const movie = db.movies.find((m) => m.id === id);
      if (!movie) return json(res, 404, { error: "Movie not found" });
      return json(res, 200, { ...movie, posterCdnBase: "" });
    }

    // GET /schedule/today
    if (method === "GET" && path === "/schedule/today") {
      return json(res, 200, { day: vnDayKey(), movieId: "" });
    }

    // GET /showtimes?movieId=&date=&cinema=
    if (method === "GET" && path === "/showtimes") {
      const movieId = url.searchParams.get("movieId") ?? undefined;
      const date = url.searchParams.get("date") ?? vnDayKey();
      const cinema = url.searchParams.get("cinema") ?? undefined;
      const schedule = { day: date, movieId: movieId ?? "" };

      if (movieId) {
        await ensureShowtimesForMovie(movieId, { cinemaId: cinema, date });
      }

      let items = db.showtimes
        .filter((s) => !movieId || s.movieId === movieId)
        .filter((s) => s.startsAt.startsWith(date))
        .filter((s) => isShowtimeBookable(s.startsAt));
      if (cinema) {
        items = items.filter((s) => {
          const screen = db.screens.find((sc) => sc.id === s.screenId);
          return screen?.cinemaId === cinema;
        });
      }
      return json(res, 200, { items: items.map(enrichShowtime), schedule });
    }

    // GET /showtimes/:id
    if (method === "GET" && path.startsWith("/showtimes/") && !path.endsWith("/seats")) {
      const id = path.split("/")[2];
      let st = db.showtimes.find((s) => s.id === id);
      if (!st && id.startsWith("st-")) {
        const movieId = showtimeMovieId(id);
        if (movieId) {
          await ensureShowtimesForMovie(movieId);
          st = db.showtimes.find((s) => s.id === id);
        }
      }
      if (!st || !isShowtimeBookable(st.startsAt)) return json(res, 404, { error: "Showtime not found" });
      return json(res, 200, enrichShowtime(st));
    }

    // GET /showtimes/:id/seats
    if (method === "GET" && path.match(/^\/showtimes\/[^/]+\/seats$/)) {
      const id = path.split("/")[2];
      const st = db.showtimes.find((s) => s.id === id);
      if (!st || !isShowtimeBookable(st.startsAt)) return json(res, 404, { error: "Showtime not found" });
      const screen = db.screens.find((s) => s.id === st.screenId)!;
      const url = new URL(req.url ?? "", "http://localhost");
      const userId = url.searchParams.get("userId") ?? undefined;
      const now = Date.now();
      const activeLocks = [...db.locks.values()].filter(
        (l) => l.showtimeId === id && l.expiresAt > now
      );
      const locked = activeLocks
        .filter((l) => !userId || l.userId !== userId)
        .map((l) => l.seat);
      const myLocked = userId
        ? activeLocks.filter((l) => l.userId === userId).map((l) => l.seat)
        : [];
      const showtimeBookings = db.bookings.filter(
        (b) => b.showtimeId === id && b.status !== "CANCELLED"
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
      return json(res, 200, {
        rows: screen.rows,
        cols: screen.cols,
        locked,
        booked,
        myLocked,
        myPendingSeats,
        pendingBookingId: myPending?.id,
      });
    }

    // POST /seats/lock
    if (method === "POST" && path === "/seats/lock") {
      const body = await parseBody(req);
      const { showtimeId, seats, userId } = body as {
        showtimeId?: string;
        seats?: string[];
        userId?: string;
      };
      if (!showtimeId || !seats?.length || !userId) {
        return json(res, 400, { error: "showtimeId, seats, userId required" });
      }
      try {
        requireBookableShowtime(showtimeId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lock failed";
        return json(res, msg === SHOWTIME_CLOSED_MSG ? 410 : 409, { error: msg });
      }
      const ttl = 5 * 60 * 1000;
      const t = Date.now();
      for (const seat of seats) {
        const key = seatKey(showtimeId, seat);
        const ex = db.locks.get(key);
        if (ex && ex.userId !== userId && ex.expiresAt > t) {
          return json(res, 409, { error: `Seat ${seat} locked` });
        }
      }
      for (const seat of seats) {
        db.locks.set(seatKey(showtimeId, seat), {
          showtimeId,
          seat,
          userId,
          expiresAt: t + ttl,
        });
      }
      return json(res, 200, { locked: seats, expiresInSec: 300 });
    }

    // POST /seats/release
    if (method === "POST" && path === "/seats/release") {
      const body = await parseBody(req);
      const { showtimeId, userId, seats } = body as {
        showtimeId?: string;
        userId?: string;
        seats?: string[];
      };
      if (!showtimeId || !userId) {
        return json(res, 400, { error: "showtimeId, userId required" });
      }
      const now = Date.now();
      const targetSeats = seats?.length ? new Set(seats) : null;
      for (const [key, lock] of db.locks) {
        if (lock.showtimeId !== showtimeId || lock.userId !== userId || lock.expiresAt <= now) {
          continue;
        }
        if (targetSeats && !targetSeats.has(lock.seat)) continue;
        db.locks.delete(key);
      }
      const pending = db.bookings.find(
        (b) => b.showtimeId === showtimeId && b.userId === userId && b.status === "PENDING"
      );
      if (pending) {
        const shouldCancel =
          !targetSeats || pending.seats.every((seat) => targetSeats.has(seat));
        if (shouldCancel) pending.status = "CANCELLED";
      }
      return json(res, 200, { released: true });
    }

    // POST /payments/vnpay/create — real VNPay sandbox redirect (local dev)
    if (method === "POST" && path === "/payments/vnpay/create") {
      const vnpay = getMockVnpay();
      if (!vnpay) return json(res, 501, { error: "VNPay is not configured" });
      const body = await parseBody(req);
      const result = createPendingCheckout(body);
      if ("error" in result) return json(res, result.status, result.body);
      const { booking, ticketId, quote } = result;
      if (booking.status === "CONFIRMED") {
        return json(res, 200, {
          bookingId: booking.id,
          ticketId,
          amount: 0,
          paid: true,
          quote,
        });
      }
      const amountVnd = usdToVnd(booking.totalAmount);
      const paymentUrl = buildVnpayPaymentUrl(vnpay, {
        txnRef: booking.id,
        amountVnd,
        orderInfo: `Movie tickets ${booking.seats.join(" ")}`,
      });
      return json(res, 200, {
        bookingId: booking.id,
        ticketId,
        amountVnd,
        paymentUrl,
        paid: false,
        quote,
      });
    }

    // POST /payments/vnpay/confirm — verify VNPay return params (local dev)
    if (method === "POST" && path === "/payments/vnpay/confirm") {
      const vnpay = getMockVnpay();
      if (!vnpay) return json(res, 501, { error: "VNPay is not configured" });
      const params = (await parseBody(req)) as Record<string, string>;
      if (!verifyVnpayCallback(params, vnpay.hashSecret)) {
        return json(res, 400, { error: "Invalid payment response." });
      }
      const booking = db.bookings.find((b) => b.id === params.vnp_TxnRef);
      if (!booking) return json(res, 404, { error: "Booking not found" });
      const ticket = db.tickets.find((t) => t.bookingId === booking.id);
      if (booking.status === "CONFIRMED" || booking.status === "PAID") {
        return json(res, 200, { ticketId: ticket?.id ?? "", bookingId: booking.id });
      }
      if (!isVnpaySuccess(params)) {
        booking.status = "CANCELLED";
        for (const seat of booking.seats) db.locks.delete(seatKey(booking.showtimeId, seat));
        return json(res, 400, {
          error: `Payment failed (code ${params.vnp_ResponseCode ?? "?"}).`,
        });
      }
      const expected = usdToVnd(booking.totalAmount) * 100;
      if (Number(params.vnp_Amount) !== expected) {
        return json(res, 400, { error: "Payment amount mismatch." });
      }
      booking.status = "CONFIRMED";
      applyGiftCardRedeem(booking, booking.userId);
      for (const seat of booking.seats) db.locks.delete(seatKey(booking.showtimeId, seat));
      return json(res, 200, { ticketId: ticket?.id ?? "", bookingId: booking.id });
    }

    // POST /payments/mock/create — pending booking (local dev, no VNPay creds)
    if (method === "POST" && path === "/payments/mock/create") {
      const body = await parseBody(req);
      const result = createPendingCheckout(body);
      if ("error" in result) return json(res, result.status, result.body);
      const { booking, ticketId, quote } = result;
      return json(res, 200, {
        bookingId: booking.id,
        ticketId,
        amount: booking.status === "CONFIRMED" ? 0 : booking.totalAmount,
        paid: booking.status === "CONFIRMED",
        quote,
      });
    }

    // POST /payments/mock/confirm
    if (method === "POST" && path === "/payments/mock/confirm") {
      const body = await parseBody(req);
      const { bookingId, userId } = body as { bookingId?: string; userId?: string };
      if (!bookingId || !userId) {
        return json(res, 400, { error: "bookingId, userId required" });
      }
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (!booking || booking.userId !== userId) {
        return json(res, 404, { error: "Booking not found" });
      }
      if (booking.status === "CONFIRMED" || booking.status === "PAID") {
        const ticket = db.tickets.find((t) => t.bookingId === bookingId);
        return json(res, 200, { ticketId: ticket?.id ?? "", bookingId });
      }
      if (booking.status !== "PENDING") {
        return json(res, 400, { error: "Booking is not pending" });
      }
      booking.status = "CONFIRMED";
      applyGiftCardRedeem(booking, userId);
      const payment: typeof db.payments[0] = {
        paymentId: createId("pay"),
        status: "SUCCESS",
        provider: "MOCK",
        amount: booking.totalAmount,
        userId,
      };
      db.payments.push(payment);
      for (const seat of booking.seats) {
        db.locks.delete(seatKey(booking.showtimeId, seat));
      }
      const ticket = db.tickets.find((t) => t.bookingId === bookingId);
      return json(res, 200, { ticketId: ticket?.id ?? "", bookingId });
    }

    // POST /payments/mock/cancel
    if (method === "POST" && path === "/payments/mock/cancel") {
      const body = await parseBody(req);
      const { bookingId, userId } = body as { bookingId?: string; userId?: string };
      if (!bookingId || !userId) {
        return json(res, 400, { error: "bookingId, userId required" });
      }
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (!booking || booking.userId !== userId) {
        return json(res, 404, { error: "Booking not found" });
      }
      if (booking.status === "PENDING") booking.status = "CANCELLED";
      for (const seat of booking.seats) {
        db.locks.delete(seatKey(booking.showtimeId, seat));
      }
      return json(res, 200, { cancelled: true });
    }

    // POST /payments/mock
    if (method === "POST" && path === "/payments/mock") {
      const body = await parseBody(req);
      const { userId, amount } = body as { userId?: string; amount?: number };
      if (!userId || amount == null) return json(res, 400, { error: "userId, amount required" });
      const payment: typeof db.payments[0] = {
        paymentId: createId("pay"),
        status: "SUCCESS",
        provider: "MOCK",
        amount,
        userId,
      };
      db.payments.push(payment);
      return json(res, 200, payment);
    }

    // POST /bookings
    if (method === "POST" && path === "/bookings") {
      const body = await parseBody(req);
      const { showtimeId, userId, seats, totalAmount } = body as {
        showtimeId?: string;
        userId?: string;
        seats?: string[];
        totalAmount?: number;
      };
      if (!showtimeId || !userId || !seats?.length || totalAmount == null) {
        return json(res, 400, { error: "showtimeId, userId, seats, totalAmount required" });
      }
      try {
        requireBookableShowtime(showtimeId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Booking failed";
        return json(res, msg === SHOWTIME_CLOSED_MSG ? 410 : 400, { error: msg });
      }
      const bookingId = createId("bk");
      const booking = {
        id: bookingId,
        showtimeId,
        userId,
        seats,
        status: "CONFIRMED" as const,
        totalAmount,
        createdAt: now(),
      };
      db.bookings.push(booking);
      const ticketId = createId("tk");
      const qrCode = `TICKET:${ticketId}:${bookingId}`;
      db.tickets.push({ id: ticketId, bookingId, qrCode });
      for (const seat of seats) db.locks.delete(seatKey(showtimeId, seat));
      return json(res, 202, { bookingId, ticketId, status: "CONFIRMED", qrCode });
    }

    // GET /promotions — active vouchers for public browse
    if (method === "GET" && path === "/promotions") {
      return json(res, 200, { items: activePromotions() });
    }

    // POST /checkout/quote
    if (method === "POST" && path === "/checkout/quote") {
      const body = await parseBody(req);
      const { showtimeId, seats, voucherCode, giftCardCode, subtotalAmount } = body as {
        showtimeId?: string;
        seats?: string[];
        voucherCode?: string;
        giftCardCode?: string;
        subtotalAmount?: number;
      };
      let subtotal = Number(subtotalAmount ?? 0);
      if (showtimeId && seats?.length) {
        const showtime = db.showtimes.find((s) => s.id === showtimeId);
        if (!showtime) return json(res, 404, { error: "Showtime not found" });
        subtotal = Math.round(seats.length * showtime.price * 100) / 100;
      }
      const quote = quoteCheckout({
        subtotalAmount: subtotal,
        voucherCode,
        giftCardCode,
        seatCount: seats?.length ?? 0,
      });
      return json(res, 200, quote);
    }

    // GET /giftcards/:code — public balance check
    if (method === "GET" && path.startsWith("/giftcards/")) {
      const code = decodeURIComponent(path.split("/")[2] ?? "");
      const card = findGiftCard(code);
      if (!card) return json(res, 404, { error: "Gift card not found" });
      return json(res, 200, {
        code: card.code,
        balance: card.balance,
        status: card.status,
      });
    }

    // GET /bookings?userId=
    if (method === "GET" && path === "/bookings") {
      const userId = url.searchParams.get("userId") ?? "";
      if (!userId) return json(res, 400, { error: "userId required" });
      const items = db.bookings
        .filter((b) => b.userId === userId && b.status !== "CANCELLED")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((b) => {
          const ticket = db.tickets.find((t) => t.bookingId === b.id);
          const st = db.showtimes.find((s) => s.id === b.showtimeId);
          return {
            ...b,
            ticketId: ticket?.id,
            movieTitle: st ? enrichShowtime(st).movieTitle : undefined,
            startsAt: st?.startsAt,
          };
        });
      return json(res, 200, { items });
    }

    // POST /group-bookings — local acknowledgement store
    if (method === "POST" && path === "/group-bookings") {
      const body = await parseBody(req);
      const id = createId("grp");
      return json(res, 201, {
        id,
        received: true,
        message: "Group booking request received. Our team will contact you.",
        payload: body,
      });
    }

    // GET /tickets/:id
    if (method === "GET" && path.startsWith("/tickets/") && !path.endsWith("/qr")) {
      const id = path.split("/")[2];
      const ticket = db.tickets.find((t) => t.id === id || t.bookingId === id);
      if (!ticket) return json(res, 404, { error: "Ticket not found" });
      const booking = db.bookings.find((b) => b.id === ticket.bookingId);
      return json(res, 200, { ticket, booking });
    }

    // GET /tickets/:id/qr
    if (method === "GET" && path.endsWith("/qr")) {
      const id = path.split("/")[2];
      const ticket = db.tickets.find((t) => t.id === id || t.bookingId === id);
      if (!ticket) return json(res, 404, { error: "Ticket not found" });
      return json(res, 200, { ticketId: ticket.id, qrPayload: ticket.qrCode });
    }

    // ADMIN
    if (path.startsWith("/admin")) {
      const body = method === "GET" ? {} : await parseBody(req);
      if (path === "/admin/movies") body._archived = url.searchParams.get("archived") ?? "";
      if (path === "/admin/reports/revenue") {
        body._from = url.searchParams.get("from") ?? "";
        body._to = url.searchParams.get("to") ?? "";
        body._groupBy = url.searchParams.get("groupBy") ?? "day";
      }
      if (path === "/admin/metrics/traffic") {
        body._days = url.searchParams.get("days") ?? "7";
      }
      if (handleMockAdmin(res, method, path, body)) return;
    }

    return json(res, 404, { error: "Not found", path, method });
  };
}
