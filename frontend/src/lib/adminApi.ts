import type {
  AdminSettings,
  Booking,
  Cinema,
  GiftCard,
  GiftCardTransaction,
  Movie,
  RevenueReport,
  Screen,
  TrafficMetrics,
  Voucher,
} from "../../../shared/types";
import { request, type EnrichedShowtime } from "./api";
import { moviePosterSrc } from "../../../shared/movieHelpers";

export type AdminMoviesResponse = {
  items: Movie[];
  posterCdnBase?: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const adminApi = {
  revenueReport: (params: { from: string; to: string; groupBy: "day" | "week" | "month" }) => {
    const q = new URLSearchParams(params);
    return request<RevenueReport>(`/admin/reports/revenue?${q}`);
  },

  trafficMetrics: (days = 7) =>
    request<TrafficMetrics>(`/admin/metrics/traffic?days=${days}`),

  movies: (params?: { archived?: "true" | "only"; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.archived) q.set("archived", params.archived);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return request<AdminMoviesResponse>(`/admin/movies${suffix}`);
  },

  createMovie: (body: Record<string, unknown>) =>
    request<Movie>("/admin/movies", { method: "POST", body: JSON.stringify(body) }),

  updateMovie: (id: string, body: Record<string, unknown>) =>
    request<Movie>(`/admin/movies/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  archiveMovie: (id: string) =>
    request<Movie>(`/admin/movies/${id}`, { method: "DELETE" }),

  importTmdb: (tmdbId: number) =>
    request<Movie>("/admin/movies/import-tmdb", {
      method: "POST",
      body: JSON.stringify({ tmdbId }),
    }),

  uploadPoster: async (id: string, file: File) => {
    const data = await fileToBase64(file);
    return request<Movie>(`/admin/movies/${id}/poster`, {
      method: "POST",
      body: JSON.stringify({ data, contentType: file.type || "image/jpeg" }),
    });
  },

  showtimes: () => request<{ items: EnrichedShowtime[] }>("/admin/showtimes"),

  createShowtime: (body: Record<string, unknown>) =>
    request<EnrichedShowtime>("/admin/showtimes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateShowtime: (id: string, body: Record<string, unknown>) =>
    request<EnrichedShowtime>(`/admin/showtimes/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteShowtime: (id: string) =>
    request<{ ok: boolean }>(`/admin/showtimes/${id}`, { method: "DELETE" }),

  bookings: () => request<{ items: Booking[] }>("/admin/bookings"),

  cinemas: () =>
    request<{ items: Cinema[]; screens: Screen[] }>("/admin/cinemas"),

  settings: () => request<AdminSettings>("/admin/settings"),

  saveSettings: (body: AdminSettings) =>
    request<AdminSettings>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  vouchers: () => request<{ items: Voucher[] }>("/admin/vouchers"),
  createVoucher: (body: Partial<Voucher>) =>
    request<Voucher>("/admin/vouchers", { method: "POST", body: JSON.stringify(body) }),
  updateVoucher: (code: string, body: Partial<Voucher>) =>
    request<Voucher>(`/admin/vouchers/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteVoucher: (code: string) =>
    request<{ deleted: boolean }>(`/admin/vouchers/${encodeURIComponent(code)}`, {
      method: "DELETE",
    }),

  giftCards: () => request<{ items: GiftCard[] }>("/admin/giftcards"),
  issueGiftCard: (body: { code?: string; balance: number; issuedBy?: string; note?: string }) =>
    request<GiftCard>("/admin/giftcards", { method: "POST", body: JSON.stringify(body) }),
  lockGiftCard: (code: string, actor = "admin") =>
    request<GiftCard>(`/admin/giftcards/${encodeURIComponent(code)}/lock`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }),
  unlockGiftCard: (code: string, actor = "admin") =>
    request<GiftCard>(`/admin/giftcards/${encodeURIComponent(code)}/unlock`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    }),
  adjustGiftCard: (code: string, body: { amount: number; actor?: string; note?: string }) =>
    request<GiftCard>(`/admin/giftcards/${encodeURIComponent(code)}/adjust`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  giftCardHistory: (code: string) =>
    request<{ items: GiftCardTransaction[] }>(
      `/admin/giftcards/${encodeURIComponent(code)}/history`
    ),

  posterSrc(movie: Movie, posterCdnBase?: string) {
    return moviePosterSrc(movie, posterCdnBase);
  },
};
