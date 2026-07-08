const BASE = import.meta.env.VITE_API_URL || "/api";
/** /api = local mock (dev only). Set VITE_API_URL = AWS API Gateway URL after sandbox. */

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export { request };

export type EnrichedShowtime = {
  id: string;
  movieId: string;
  movieTitle: string;
  startsAt: string;
  price: number;
  screenName: string;
  cinemaName: string;
  rows: number;
  cols: number;
  isSpecial?: boolean;
};

export type DailySchedule = { day: string; movieId: string };

export const api = {
  health: () =>
    request<{ ok: boolean; mode?: string; vnpayEnabled?: boolean }>("/health"),

  getMovies: () =>
    request<{ items: import("../../../shared/types").Movie[]; posterCdnBase?: string }>("/movies"),

  getMovieOverrides: () =>
    request<{ items: import("../../../shared/types").Movie[]; posterCdnBase?: string }>(
      "/movies/overrides"
    ),
  getMovie: (id: string) => request<import("../../../shared/types").Movie>(`/movies/${id}`),

  getShowtimes: (movieId?: string, opts?: { date?: string; cinema?: string }) => {
    const params = new URLSearchParams();
    if (movieId) params.set("movieId", movieId);
    if (opts?.date) params.set("date", opts.date);
    if (opts?.cinema) params.set("cinema", opts.cinema);
    const q = params.toString();
    return request<{ items: EnrichedShowtime[]; schedule: DailySchedule }>(`/showtimes${q ? `?${q}` : ""}`);
  },
  getTodaySchedule: () => request<DailySchedule>("/schedule/today"),
  getShowtime: (id: string) => request<EnrichedShowtime>(`/showtimes/${id}`),
  getSeats: (showtimeId: string, userId?: string) => {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return request<{
      rows: number;
      cols: number;
      locked: string[];
      booked: string[];
      myLocked?: string[];
      myPendingSeats?: string[];
      pendingBookingId?: string;
    }>(`/showtimes/${showtimeId}/seats${q}`);
  },

  lockSeats: (body: { showtimeId: string; seats: string[]; userId: string }) =>
    request("/seats/lock", { method: "POST", body: JSON.stringify(body) }),

  releaseSeats: (body: { showtimeId: string; userId: string; seats?: string[] }) =>
    request("/seats/release", { method: "POST", body: JSON.stringify(body) }),

  createMockCheckout: (body: {
    showtimeId: string;
    userId: string;
    seats: string[];
    totalAmount: number;
  }) =>
    request<{ bookingId: string; ticketId: string; amount: number }>(
      "/payments/mock/create",
      { method: "POST", body: JSON.stringify(body) }
    ),

  confirmMockPayment: (body: { bookingId: string; userId: string }) =>
    request<{ ticketId: string; bookingId: string }>("/payments/mock/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelMockCheckout: (body: { bookingId: string; userId: string }) =>
    request<{ cancelled: boolean }>("/payments/mock/cancel", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  mockPayment: (body: { userId: string; amount: number }) =>
    request("/payments/mock", { method: "POST", body: JSON.stringify(body) }),

  createVnpayPayment: (body: {
    showtimeId: string;
    userId: string;
    seats: string[];
    totalAmount: number;
  }) =>
    request<{ paymentUrl: string; bookingId: string; amountVnd: number }>(
      "/payments/vnpay/create",
      { method: "POST", body: JSON.stringify(body) }
    ),

  confirmVnpayPayment: (params: Record<string, string>) =>
    request<{ ticketId: string; bookingId: string }>("/payments/vnpay/confirm", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  createBooking: (body: {
    showtimeId: string;
    userId: string;
    seats: string[];
    totalAmount: number;
  }) =>
    request<{ bookingId: string; ticketId: string; qrCode: string }>("/bookings", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  ticketQr: (id: string) =>
    request<{ qrPayload: string; ticketId: string }>(`/tickets/${id}/qr`),

  adminCinemas: () =>
    request<{
      items: import("../../../shared/types").Cinema[];
      screens: import("../../../shared/types").Screen[];
    }>("/admin/cinemas"),

  adminCreateMovie: (body: Record<string, unknown>) =>
    request("/admin/movies", { method: "POST", body: JSON.stringify(body) }),

  adminCreateShowtime: (body: Record<string, unknown>) =>
    request("/admin/showtimes", { method: "POST", body: JSON.stringify(body) }),

  adminBookings: () =>
    request<{ items: import("../../../shared/types").Booking[] }>("/admin/bookings"),
};
