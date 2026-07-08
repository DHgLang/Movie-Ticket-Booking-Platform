import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type EnrichedShowtime } from "../lib/api";
import { getCinemaById } from "../data/cinemas";
import { SHOWTIME_POLL_MS } from "../lib/pollInterval";
import { usePoll } from "../lib/usePoll";
import { fetchMovieDisplay, type CatalogMovie } from "../lib/movieCatalog";

function formatReleaseDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="gv-detail-row">
      <span className="gv-detail-label">{label}</span>
      <span className="gv-detail-value">{value}</span>
    </div>
  );
}

export default function ShowtimesPage() {
  const { movieId } = useParams();
  const [search] = useSearchParams();
  const cinema = search.get("cinema");
  const date = search.get("date") ?? new Date().toISOString().slice(0, 10);
  const [list, setList] = useState<EnrichedShowtime[]>([]);
  const [movie, setMovie] = useState<CatalogMovie | null>(null);
  const [loading, setLoading] = useState(true);

  const loadShowtimes = useCallback(() => {
    if (!movieId) return;
    setLoading(true);
    api
      .getShowtimes(movieId, { date, cinema: cinema ?? undefined })
      .then((r) => setList(r.items))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [movieId, date, cinema]);

  useEffect(() => {
    if (!movieId) return;
    fetchMovieDisplay(movieId)
      .then((m) => setMovie(m))
      .catch(() => setMovie(null));
  }, [movieId]);

  usePoll(loadShowtimes, SHOWTIME_POLL_MS, [loadShowtimes]);

  const title = movie?.title ?? (movieId ? `Movie #${movieId}` : "");
  const castLine = movie?.cast?.length ? movie.cast.join(", ") : undefined;
  const ratingLabel = movie?.rating?.trim() || "PG-13";

  return (
    <div className="gv-container gv-page">
      <div className="gv-breadcrumb">
        <Link to="/buy-tickets">Buy Tickets</Link> / Showtimes
      </div>

      <article className="gv-showtime-movie">
        <header className="gv-showtime-movie-head">
          <div className="gv-showtime-title-row">
            <h1 className="gv-showtime-movie-title">{title}</h1>
            <div className="gv-showtime-rating">
              <span className="gv-rating-badge">{ratingLabel}</span>
            </div>
          </div>
          {movie?.voteAverage != null && movie.voteAverage > 0 && (
            <p className="gv-showtime-movie-note">★ {movie.voteAverage.toFixed(1)} audience score</p>
          )}
        </header>

        <hr className="gv-showtime-movie-rule" />

        <div className="gv-showtime-movie-body">
          <div className="gv-detail-poster-col">
            <div className="gv-poster-frame">
              {movie?.posterUrl ?
                <img src={movie.posterUrl} alt={title} className="gv-detail-poster" />
              : <div className="gv-detail-poster gv-detail-poster-empty">No poster</div>}
              <div className="gv-poster-frame-foot">Spirit Movie</div>
            </div>
          </div>

          <div className="gv-movie-detail-main">
            <section className="gv-movie-info-section">
              <h2 className="gv-detail-section-title">Details</h2>
              <div className="gv-detail-columns">
                <div className="gv-detail-col">
                  <DetailRow label="Cast" value={castLine} />
                  <DetailRow label="Director" value={movie?.director} />
                  <DetailRow label="Genre" value={movie?.genre} />
                </div>
                <div className="gv-detail-col">
                  <DetailRow label="Release" value={formatReleaseDate(movie?.releaseDate)} />
                  <DetailRow
                    label="Running Time"
                    value={movie?.durationMin ? `${movie.durationMin} minutes` : undefined}
                  />
                  <DetailRow
                    label="Language"
                    value={
                      movie?.language ? `${movie.language} (Sub: English)` : "English (Sub: English)"
                    }
                  />
                </div>
              </div>
            </section>

            {movie?.description && (
              <section className="gv-movie-info-section gv-movie-info-section-synopsis">
                <h2 className="gv-detail-section-title">Synopsis</h2>
                <p className="gv-movie-synopsis">{movie.description}</p>
              </section>
            )}
          </div>
        </div>
      </article>

      {(cinema || date) && (
        <div className="gv-movie-booking-meta">
          {cinema && (
            <p className="gv-meta">
              Cinema: <strong>{getCinemaById(cinema)?.name ?? cinema}</strong>
            </p>
          )}
          <p className="gv-meta">
            Date: <strong>{date}</strong>
          </p>
        </div>
      )}

      <div className="gv-section-title-row">
        <h2 className="gv-section-title">Select Date & Time</h2>
        {loading && <span className="gv-spinner" aria-label="Updating schedule" />}
      </div>

      {loading && list.length === 0 && (
        <p className="gv-meta gv-schedule-status">Updating showtimes (3–5 slots per day)…</p>
      )}

      {!loading && list.length === 0 && (
        <p className="gv-meta">
          No showtimes for this date. Try another day — each movie has 3–5 showtimes per day.
        </p>
      )}

      {list.length > 0 && (
        <div className="gv-showtime-list">
          {list.map((s) => (
            <div key={s.id} className="gv-showtime-item">
              <div className="gv-showtime-info">
                <strong>{s.cinemaName}</strong>
                <span>{s.screenName}</span>
                {s.isSpecial && (
                  <span className="gv-admin-badge gv-admin-badge-SPECIAL">Suất đặc biệt</span>
                )}
                <span>{new Date(s.startsAt).toLocaleString("en-SG")}</span>
              </div>
              <div className="gv-showtime-action">
                <span className="gv-price-tag">USD {s.price.toFixed(2)}</span>
                <Link
                  to={`/seats/${s.id}?title=${encodeURIComponent(title)}`}
                  className="gv-btn-gold"
                >
                  Select Seats
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
