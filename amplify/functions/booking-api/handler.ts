import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { randomUUID } from "crypto";
import * as store from "../_shared/store";
import { getTrafficMetrics } from "../_shared/cloudwatchMetrics";
import {
  buildVnpayPaymentUrl,
  getVnpayConfig,
  isVnpaySuccess,
  usdToVnd,
  verifyVnpayCallback,
} from "../_shared/vnpay";

const sqs = new SQSClient({});
const QUEUE_URL = process.env.BOOKING_QUEUE_URL ?? "";
const FRONTEND_URL =
  process.env.FRONTEND_URL ?? "https://main.d2zv6ka00i1nyo.amplifyapp.com";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

const redirect = (location: string) => ({
  statusCode: 302,
  headers: { Location: location },
  body: "",
});

const ipnResponse = (rspCode: string, message: string) => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ RspCode: rspCode, Message: message }),
});

function getApiBaseUrl(event: Parameters<APIGatewayProxyHandlerV2>[0]): string {
  const headers = event.headers ?? {};
  const proto =
    headers["x-forwarded-proto"] ?? headers["X-Forwarded-Proto"] ?? "https";
  const host =
    headers.host ?? headers.Host ?? event.requestContext?.domainName ?? "";
  return `${proto}://${host}`;
}

function queryParams(
  q: Record<string, string | undefined> | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!q) return out;
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function enqueueBooking(payload: {
  bookingId: string;
  ticketId: string;
  showtimeId: string;
  userId: string;
  seats: string[];
  totalAmount: number;
}) {
  if (!QUEUE_URL) return;
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(payload),
    })
  );
}

async function processVnpayPayment(params: Record<string, string>, hashSecret: string) {
  if (!verifyVnpayCallback(params, hashSecret)) {
    return { ok: false as const, reason: "invalid" };
  }

  const bookingId = params.vnp_TxnRef ?? "";
  const booking = await store.getBooking(bookingId);
  if (!booking) return { ok: false as const, reason: "notfound" };

  const expectedAmount = String(usdToVnd(booking.totalAmount) * 100);
  if (params.vnp_Amount !== expectedAmount) {
    return { ok: false as const, reason: "amount" };
  }

  if (!isVnpaySuccess(params)) {
    await store.cancelPendingBooking(bookingId);
    return {
      ok: false as const,
      reason: "failed",
      code: params.vnp_ResponseCode ?? "unknown",
    };
  }

  const wasConfirmed = booking.status === "CONFIRMED" || booking.status === "PAID";
  const result = await store.finalizeBookingAfterPayment(bookingId);
  if (!result) return { ok: false as const, reason: "finalize" };

  if (!wasConfirmed && result.status === "CONFIRMED") {
    await enqueueBooking({
      bookingId: result.bookingId,
      ticketId: result.ticketId,
      showtimeId: booking.showtimeId,
      userId: booking.userId,
      seats: booking.seats,
      totalAmount: booking.totalAmount,
    });
  }

  return { ok: true as const, ticketId: result.ticketId, bookingId: result.bookingId };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? "/";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    };
  }

  let body: Record<string, unknown> = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return json(400, { error: "Invalid JSON" });
    }
  }

  try {
    // GET /health
    if (method === "GET" && path === "/health") {
      const vnpayEnabled = !!getVnpayConfig(getApiBaseUrl(event), FRONTEND_URL);
      return json(200, { ok: true, mode: "aws", service: "booking-api", vnpayEnabled });
    }

    // GET /movies/overrides — admin edits + manual movies only (public merge with TMDB)
    if (method === "GET" && path === "/movies/overrides") {
      const items = await store.listMovies({ includeArchived: true });
      return json(200, { items, posterCdnBase: store.getPosterCdnBase() });
    }

    // GET /movies — legacy alias
    if (method === "GET" && path === "/movies") {
      const items = await store.listMovies({ includeArchived: false });
      return json(200, { items, posterCdnBase: store.getPosterCdnBase() });
    }

    // GET /movies/:id
    if (method === "GET" && path.startsWith("/movies/")) {
      const id = path.split("/")[2];
      const movie = await store.getMovie(id);
      if (!movie) return json(404, { error: "Movie not found" });
      return json(200, { ...movie, posterCdnBase: store.getPosterCdnBase() });
    }

    // GET /showtimes
    if (method === "GET" && path === "/showtimes") {
      const params = event.queryStringParameters ?? {};
      const result = await store.listShowtimes({
        movieId: params.movieId,
        date: params.date,
        cinema: params.cinema,
      });
      return json(200, result);
    }

    // GET /schedule/today
    if (method === "GET" && path === "/schedule/today") {
      const schedule = await store.getDailySchedule();
      return json(200, schedule);
    }

    // GET /showtimes/:id/seats
    if (method === "GET" && path.match(/^\/showtimes\/[^/]+\/seats$/)) {
      const id = path.split("/")[2];
      const userId = event.queryStringParameters?.userId;
      const seats = await store.getSeats(id, userId);
      if (!seats) return json(404, { error: "Showtime not found" });
      return json(200, seats);
    }

    // GET /showtimes/:id
    if (method === "GET" && path.startsWith("/showtimes/")) {
      const id = path.split("/")[2];
      const st = await store.getShowtime(id);
      if (!st) return json(404, { error: "Showtime not found" });
      return json(200, st);
    }

    // POST /seats/release
    if (method === "POST" && path === "/seats/release") {
      const { showtimeId, userId, seats } = body as {
        showtimeId?: string;
        userId?: string;
        seats?: string[];
      };
      if (!showtimeId || !userId) {
        return json(400, { error: "showtimeId, userId required" });
      }
      const result = await store.releaseSeats(showtimeId, userId, seats);
      return json(200, result);
    }

    // POST /seats/lock
    if (method === "POST" && path === "/seats/lock") {
      const { showtimeId, seats, userId } = body as {
        showtimeId?: string;
        seats?: string[];
        userId?: string;
      };
      if (!showtimeId || !seats?.length || !userId) {
        return json(400, { error: "showtimeId, seats, userId required" });
      }
      try {
        const result = await store.lockSeats(showtimeId, seats, userId);
        return json(200, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lock failed";
        const code = msg === store.SHOWTIME_CLOSED_MSG ? 410 : 409;
        return json(code, { error: msg });
      }
    }

    // POST /payments/vnpay/create
    if (method === "POST" && path === "/payments/vnpay/create") {
      const config = getVnpayConfig(getApiBaseUrl(event), FRONTEND_URL);
      if (!config) return json(503, { error: "VNPay not configured" });

      const { showtimeId, userId, seats, totalAmount } = body as {
        showtimeId?: string;
        userId?: string;
        seats?: string[];
        totalAmount?: number;
      };
      if (!showtimeId || !userId || !seats?.length || totalAmount == null) {
        return json(400, { error: "showtimeId, userId, seats, totalAmount required" });
      }

      let useBookingId: string;
      try {
        const pending = await store.resumeOrCreatePendingBooking({
          showtimeId,
          userId,
          seats,
          totalAmount,
        });
        useBookingId = pending.bookingId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Booking failed";
        if (msg === store.SHOWTIME_CLOSED_MSG) return json(410, { error: msg });
        throw e;
      }

      const showtime = await store.getShowtime(showtimeId);
      const amountVnd = usdToVnd(totalAmount);
      const ipAddr = event.requestContext?.http?.sourceIp ?? "127.0.0.1";
      const orderInfo = `Thanh_toan_${useBookingId.replace(/-/g, "").slice(0, 12)}`;

      const paymentUrl = buildVnpayPaymentUrl(config, {
        txnRef: useBookingId,
        amountVnd,
        orderInfo,
        ipAddr,
      });

      return json(200, { paymentUrl, bookingId: useBookingId, amountVnd });
    }

    // POST /payments/vnpay/confirm — frontend return URL handler
    if (method === "POST" && path === "/payments/vnpay/confirm") {
      const config = getVnpayConfig(getApiBaseUrl(event), FRONTEND_URL);
      if (!config) return json(503, { error: "VNPay not configured" });

      const params = body as Record<string, string>;
      const result = await processVnpayPayment(params, config.hashSecret);
      if (!result.ok) {
        return json(400, {
          error: "Payment verification failed",
          reason: result.reason,
          code: "code" in result ? result.code : undefined,
        });
      }
      return json(200, { ticketId: result.ticketId, bookingId: result.bookingId });
    }

    // GET /payments/vnpay/return — legacy API return URL
    if (method === "GET" && path === "/payments/vnpay/return") {
      const params = queryParams(event.queryStringParameters);
      const config = getVnpayConfig(getApiBaseUrl(event), FRONTEND_URL);
      const front = FRONTEND_URL.replace(/\/$/, "");

      if (!config) return redirect(`${front}/payment/result?success=0&reason=config`);

      const result = await processVnpayPayment(params, config.hashSecret);
      if (!result.ok) {
        if (result.reason === "failed" && "code" in result) {
          return redirect(
            `${front}/payment/result?success=0&code=${encodeURIComponent(result.code ?? "unknown")}`
          );
        }
        return redirect(`${front}/payment/result?success=0&reason=${result.reason}`);
      }

      return redirect(`${front}/ticket/${result.ticketId}`);
    }

    // GET /payments/vnpay/ipn — server-to-server confirmation
    if (method === "GET" && path === "/payments/vnpay/ipn") {
      const params = queryParams(event.queryStringParameters);
      const config = getVnpayConfig(getApiBaseUrl(event), FRONTEND_URL);
      if (!config) return ipnResponse("99", "VNPay not configured");

      if (!params.vnp_TxnRef) return ipnResponse("99", "Missing parameters");

      const booking = await store.getBooking(params.vnp_TxnRef);
      const wasConfirmed =
        booking?.status === "CONFIRMED" || booking?.status === "PAID";

      const result = await processVnpayPayment(params, config.hashSecret);

      if (!result.ok) {
        if (result.reason === "invalid") return ipnResponse("97", "Invalid Checksum");
        if (result.reason === "notfound") return ipnResponse("01", "Order not found");
        if (result.reason === "amount") return ipnResponse("04", "Invalid amount");
        return ipnResponse("00", "Confirm Success");
      }

      return ipnResponse(
        wasConfirmed ? "02" : "00",
        wasConfirmed ? "Order already confirmed" : "Confirm Success"
      );
    }

    // POST /payments/mock
    if (method === "POST" && path === "/payments/mock") {
      const { userId, amount } = body as { userId?: string; amount?: number };
      if (!userId || amount == null) return json(400, { error: "userId, amount required" });
      return json(200, {
        paymentId: randomUUID(),
        status: "SUCCESS",
        provider: "MOCK",
        amount,
        userId,
      });
    }

    // POST /bookings
    if (method === "POST" && path === "/bookings") {
      const { showtimeId, userId, seats, totalAmount } = body as {
        showtimeId?: string;
        userId?: string;
        seats?: string[];
        totalAmount?: number;
      };
      if (!showtimeId || !userId || !seats?.length || totalAmount == null) {
        return json(400, { error: "showtimeId, userId, seats, totalAmount required" });
      }

      const bookingId = randomUUID();
      try {
        const result = await store.createBooking({
          bookingId,
          showtimeId,
          userId,
          seats,
          totalAmount,
        });

        if (QUEUE_URL) {
          await sqs.send(
            new SendMessageCommand({
              QueueUrl: QUEUE_URL,
              MessageBody: JSON.stringify({
                bookingId: result.bookingId,
                ticketId: result.ticketId,
                showtimeId,
                userId,
                seats,
                totalAmount,
              }),
            })
          );
        }

        return json(202, result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Booking failed";
        if (msg === store.SHOWTIME_CLOSED_MSG) return json(410, { error: msg });
        throw e;
      }
    }

    // GET /tickets/:id
    if (method === "GET" && path.startsWith("/tickets/") && !path.endsWith("/qr")) {
      const id = path.split("/")[2];
      const data = await store.getTicket(id);
      if (!data) return json(404, { error: "Ticket not found" });
      return json(200, data);
    }

    // GET /tickets/:id/qr
    if (method === "GET" && path.endsWith("/qr")) {
      const id = path.split("/")[2];
      const data = await store.getTicket(id);
      if (!data) return json(404, { error: "Ticket not found" });
      return json(200, { ticketId: data.ticket.id, qrPayload: data.ticket.qrCode });
    }

    // ADMIN
    if (method === "GET" && path === "/admin/cinemas") {
      const [items, screens] = await Promise.all([store.listCinemas(), store.listScreens()]);
      return json(200, { items, screens });
    }

    if (method === "GET" && path === "/admin/movies") {
      const params = event.queryStringParameters ?? {};
      let items = await store.listMovies({ includeArchived: true, status: params.status });
      if (params.archived === "only") items = items.filter((m) => m.isArchived);
      else if (params.archived !== "true") items = items.filter((m) => !m.isArchived);
      return json(200, { items, posterCdnBase: store.getPosterCdnBase() });
    }

    if (method === "POST" && path === "/admin/movies") {
      const movie = await store.createMovie(body);
      return json(201, movie);
    }

    if (method === "POST" && path === "/admin/movies/import-tmdb") {
      const tmdbId = Number((body as { tmdbId?: number }).tmdbId);
      if (!tmdbId) return json(400, { error: "tmdbId required" });
      try {
        const movie = await store.importMovieFromTmdb(tmdbId);
        return json(201, movie);
      } catch (e) {
        return json(400, { error: e instanceof Error ? e.message : "Import failed" });
      }
    }

    const adminMovieMatch = path.match(/^\/admin\/movies\/([^/]+)$/);
    if (adminMovieMatch) {
      const movieId = adminMovieMatch[1];
      if (method === "PUT") {
        const movie = await store.upsertMovie(movieId, body);
        return json(200, movie);
      }
      if (method === "DELETE") {
        try {
          const movie = await store.archiveMovie(movieId);
          if (!movie) return json(404, { error: "Movie not found" });
          return json(200, movie);
        } catch (e) {
          return json(409, { error: e instanceof Error ? e.message : "Archive failed" });
        }
      }
    }

    const adminPosterMatch = path.match(/^\/admin\/movies\/([^/]+)\/poster$/);
    if (adminPosterMatch && method === "POST") {
      const movieId = adminPosterMatch[1];
      const { data, contentType } = body as { data?: string; contentType?: string };
      if (!data) return json(400, { error: "data (base64) required" });
      const movie = await store.uploadMoviePoster(movieId, data, contentType ?? "image/jpeg");
      if (!movie) return json(404, { error: "Movie not found" });
      return json(200, movie);
    }

    if (method === "GET" && path === "/admin/showtimes") {
      const items = await store.listShowtimesAdmin();
      return json(200, { items });
    }

    if (method === "POST" && path === "/admin/showtimes") {
      const st = await store.createShowtime(body);
      return json(201, st);
    }

    const adminShowtimeMatch = path.match(/^\/admin\/showtimes\/([^/]+)$/);
    if (adminShowtimeMatch) {
      const showtimeId = adminShowtimeMatch[1];
      if (method === "PUT") {
        const st = await store.updateShowtime(showtimeId, body);
        if (!st) return json(404, { error: "Showtime not found" });
        return json(200, st);
      }
      if (method === "DELETE") {
        const ok = await store.deleteShowtime(showtimeId);
        if (!ok) return json(404, { error: "Showtime not found" });
        return json(200, { ok: true });
      }
    }

    if (method === "GET" && path === "/admin/bookings") {
      const items = await store.listBookings();
      return json(200, { items });
    }

    if (method === "GET" && path === "/admin/reports/revenue") {
      const params = event.queryStringParameters ?? {};
      const report = await store.getRevenueReport({
        from: params.from,
        to: params.to,
        groupBy: params.groupBy,
      });
      return json(200, report);
    }

    if (method === "GET" && path === "/admin/metrics/traffic") {
      const days = Number(event.queryStringParameters?.days ?? 7);
      const metrics = await getTrafficMetrics(Number.isFinite(days) ? days : 7);
      return json(200, metrics);
    }

    if (method === "GET" && path === "/admin/settings") {
      return json(200, await store.getAdminSettings());
    }

    if (method === "PUT" && path === "/admin/settings") {
      return json(200, await store.saveAdminSettings(body));
    }

    return json(404, { error: "Not found", path, method });
  } catch (e) {
    console.error("API error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Internal error" });
  }
};
