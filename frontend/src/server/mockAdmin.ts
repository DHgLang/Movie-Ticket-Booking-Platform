import type { ServerResponse } from "node:http";
import type { AdminSettings, Movie, Showtime } from "../../../shared/types.ts";
import { isMovieVisibleToPublic } from "../../../shared/movieHelpers.ts";
import { buildRevenueReport } from "../../../shared/reports.ts";
import { normalizeMovieInput } from "../../../shared/movieAdmin.ts";
import { db, createId, enrichShowtime } from "./mockStore.ts";
import { isShowtimeBookable } from "../../../shared/showtimeCutoff.ts";

let adminSettings: AdminSettings = {};

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function listAdminMovies(archived?: string) {
  let items = [...db.movies];
  if (archived === "only") items = items.filter((m) => m.isArchived);
  else if (archived !== "true") items = items.filter((m) => !m.isArchived);
  return items;
}

export function handleMockAdmin(
  res: ServerResponse,
  method: string,
  path: string,
  body: Record<string, unknown>
): boolean {
  if (method === "GET" && path === "/admin/cinemas") {
    json(res, 200, { items: db.cinemas, screens: db.screens });
    return true;
  }

  if (method === "GET" && path === "/admin/movies") {
    const archived = String(body._archived ?? "");
    json(res, 200, { items: listAdminMovies(archived), posterCdnBase: "" });
    return true;
  }

  if (method === "GET" && path === "/movies/overrides") {
    json(res, 200, { items: db.movies, posterCdnBase: "" });
    return true;
  }

  if (method === "POST" && path === "/admin/movies") {
    const movie = normalizeMovieInput(body) as Movie;
    db.movies.push(movie);
    json(res, 201, movie);
    return true;
  }

  if (method === "POST" && path === "/admin/movies/import-tmdb") {
    const tmdbId = Number(body.tmdbId);
    const id = String(tmdbId);
    const existing = db.movies.find((m) => m.id === id);
    const movie: Movie = {
      id,
      tmdbId,
      title: `TMDB Movie ${tmdbId}`,
      description: "Imported from TMDB (mock — set TMDB_API_KEY for full metadata).",
      durationMin: 120,
      status: "NOW_SHOWING",
      distributorSharePct: existing?.distributorSharePct ?? 50,
      lockedFields: existing?.lockedFields,
      isArchived: existing?.isArchived,
      syncedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, movie);
    else db.movies.push(movie);
    json(res, 201, existing ?? movie);
    return true;
  }

  const movieMatch = path.match(/^\/admin\/movies\/([^/]+)$/);
  if (movieMatch) {
    const id = movieMatch[1];
    const idx = db.movies.findIndex((m) => m.id === id);
    if (method === "PUT") {
      if (idx >= 0) {
        const updated = normalizeMovieInput({ ...db.movies[idx], ...body, id }, db.movies[idx]);
        db.movies[idx] = updated;
        json(res, 200, updated);
      } else {
        const created = normalizeMovieInput({ ...body, id, tmdbId: /^\d+$/.test(id) ? Number(id) : body.tmdbId }, undefined);
        db.movies.push(created);
        json(res, 200, created);
      }
      return true;
    }
    if (method === "DELETE") {
      if (idx < 0 && /^\d+$/.test(id)) {
        db.movies.push(
          normalizeMovieInput({
            id,
            tmdbId: Number(id),
            title: `TMDB #${id}`,
            description: "",
            durationMin: 120,
            status: "NOW_SHOWING",
            isArchived: true,
            archivedAt: new Date().toISOString(),
          })
        );
        json(res, 200, db.movies[db.movies.length - 1]);
        return true;
      }
      if (idx < 0) {
        json(res, 404, { error: "Movie not found" });
        return true;
      }
      const hasFuture = db.showtimes.some(
        (s) => s.movieId === id && isShowtimeBookable(s.startsAt)
      );
      if (hasFuture) {
        json(res, 409, { error: "Cannot archive movie with upcoming showtimes" });
        return true;
      }
      db.movies[idx] = {
        ...db.movies[idx],
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };
      json(res, 200, db.movies[idx]);
      return true;
    }
  }

  const posterMatch = path.match(/^\/admin\/movies\/([^/]+)\/poster$/);
  if (posterMatch && method === "POST") {
    const id = posterMatch[1];
    let idx = db.movies.findIndex((m) => m.id === id);
    if (idx < 0 && /^\d+$/.test(id)) {
      db.movies.push(
        normalizeMovieInput({
          id,
          tmdbId: Number(id),
          title: `TMDB #${id}`,
          description: "",
          durationMin: 120,
          status: "NOW_SHOWING",
        }) as Movie
      );
      idx = db.movies.length - 1;
    }
    if (idx < 0) {
      json(res, 404, { error: "Movie not found" });
      return true;
    }
    const data = String(body.data ?? "");
    const contentType = String(body.contentType ?? "image/jpeg");
    db.movies[idx].posterUrl = `data:${contentType};base64,${data}`;
    json(res, 200, db.movies[idx]);
    return true;
  }

  if (method === "GET" && path === "/admin/showtimes") {
    json(res, 200, { items: db.showtimes.map(enrichShowtime) });
    return true;
  }

  if (method === "POST" && path === "/admin/showtimes") {
    const st: Showtime = {
      id: createId("s"),
      movieId: String(body.movieId ?? ""),
      screenId: String(body.screenId ?? ""),
      startsAt: String(body.startsAt ?? ""),
      price: Number(body.price ?? 10),
      isSpecial: Boolean(body.isSpecial ?? false),
    };
    db.showtimes.push(st);
    json(res, 201, enrichShowtime(st));
    return true;
  }

  const showtimeMatch = path.match(/^\/admin\/showtimes\/([^/]+)$/);
  if (showtimeMatch) {
    const id = showtimeMatch[1];
    const idx = db.showtimes.findIndex((s) => s.id === id);
    if (method === "PUT" && idx >= 0) {
      const st = db.showtimes[idx];
      db.showtimes[idx] = {
        ...st,
        movieId: body.movieId != null ? String(body.movieId) : st.movieId,
        screenId: body.screenId != null ? String(body.screenId) : st.screenId,
        startsAt: body.startsAt != null ? String(body.startsAt) : st.startsAt,
        price: body.price != null ? Number(body.price) : st.price,
        isSpecial: body.isSpecial != null ? Boolean(body.isSpecial) : st.isSpecial,
      };
      json(res, 200, enrichShowtime(db.showtimes[idx]));
      return true;
    }
    if (method === "DELETE" && idx >= 0) {
      db.showtimes.splice(idx, 1);
      json(res, 200, { ok: true });
      return true;
    }
  }

  if (method === "GET" && path === "/admin/bookings") {
    json(res, 200, { items: db.bookings });
    return true;
  }

  if (method === "GET" && path === "/admin/reports/revenue") {
    const from = String(body._from ?? new Date().toISOString().slice(0, 10));
    const to = String(body._to ?? from);
    const groupBy = body._groupBy === "week" || body._groupBy === "month" ? body._groupBy : "day";
    const report = buildRevenueReport({
      bookings: db.bookings,
      showtimes: db.showtimes,
      screens: db.screens,
      cinemas: db.cinemas,
      movies: db.movies,
      from,
      to,
      groupBy,
    });
    json(res, 200, report);
    return true;
  }

  if (method === "GET" && path === "/admin/metrics/traffic") {
    const days = Number(body._days ?? 7);
    const today = new Date();
    const rows = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: d.toISOString().slice(0, 10), value: Math.floor(Math.random() * 40) + 5 };
    });
    const apiRows = rows.map((r) => ({ ...r, value: Math.floor(r.value * 0.6) }));
    json(res, 200, {
      from: rows[0]?.date ?? "",
      to: rows[rows.length - 1]?.date ?? "",
      summary: {
        pageViews: rows.reduce((s, r) => s + r.value, 0),
        sessions: rows.reduce((s, r) => s + r.value, 0),
        apiRequests: apiRows.reduce((s, r) => s + r.value, 0),
        lambdaInvocations: apiRows.reduce((s, r) => s + r.value, 0),
        lambdaErrors: 0,
      },
      pageViewsByDay: rows,
      apiRequestsByDay: apiRows,
      lambdaInvocationsByDay: apiRows,
      lambdaErrorsByDay: rows.map((r) => ({ ...r, value: 0 })),
    });
    return true;
  }

  if (method === "GET" && path === "/admin/settings") {
    json(res, 200, adminSettings);
    return true;
  }

  if (method === "PUT" && path === "/admin/settings") {
    adminSettings = { ...adminSettings, ...body };
    json(res, 200, adminSettings);
    return true;
  }

  return false;
}

export function filterPublicMovies() {
  return db.movies.filter(isMovieVisibleToPublic);
}
