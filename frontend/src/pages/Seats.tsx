import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type EnrichedShowtime } from "../lib/api";
import { getUserProfile } from "../lib/auth";
import { SHOWTIME_POLL_MS } from "../lib/pollInterval";
import { usePoll } from "../lib/usePoll";
import { SHOWTIME_CLOSED_MSG } from "../../../shared/showtimeCutoff";

function seatLabel(row: number, col: number) {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

function uniqueSeats(seats: string[]) {
  return [...new Set(seats)];
}

export default function SeatsPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const [showtime, setShowtime] = useState<EnrichedShowtime | null>(null);
  const [closed, setClosed] = useState(false);
  const [locked, setLocked] = useState<string[]>([]);
  const [booked, setBooked] = useState<string[]>([]);
  const [myReserved, setMyReserved] = useState<string[]>([]);
  const [pendingBookingId, setPendingBookingId] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    if (!showtimeId) return;

    api
      .getShowtime(showtimeId)
      .then((st) => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("title");
        setShowtime(t ? { ...st, movieTitle: t } : st);
        setClosed(false);
        setError("");
      })
      .catch(() => {
        setShowtime(null);
        setClosed(true);
        setSelected([]);
      });

    getUserProfile()
      .then((profile) => api.getSeats(showtimeId, profile?.userId))
      .catch(() => api.getSeats(showtimeId))
      .then((s) => {
        setLocked(s.locked);
        setBooked(s.booked);
        const reserved = uniqueSeats([...(s.myLocked ?? []), ...(s.myPendingSeats ?? [])]);
        setMyReserved(reserved);
        setPendingBookingId(s.pendingBookingId);
        setSelected((prev) => {
          const open = new Set(
            prev.filter((seat) => !s.booked.includes(seat) && !s.locked.includes(seat))
          );
          if (open.size > 0) return [...open];
          if (reserved.length > 0) return reserved;
          return [];
        });
      })
      .catch(() => {
        setLocked([]);
        setBooked([]);
        setMyReserved([]);
        setPendingBookingId(undefined);
      });
  }, [showtimeId]);

  usePoll(refresh, SHOWTIME_POLL_MS, [refresh]);

  if (!showtime && !closed) {
    return <p className="gv-container gv-page">Loading seat map…</p>;
  }

  if (closed || !showtime) {
    return (
      <div className="gv-container gv-page">
        <h1 className="gv-page-title">Showtime closed</h1>
        <p className="gv-page-sub">
          {SHOWTIME_CLOSED_MSG}. Online sales end 10 minutes before the show.
        </p>
        <Link to="/buy-tickets" className="gv-btn-gold">
          Choose another showtime
        </Link>
      </div>
    );
  }

  const rows = showtime.rows;
  const cols = showtime.cols;
  const seats: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) seats.push(seatLabel(r, c));
  }

  const unavailable = new Set([...locked, ...booked]);
  const total = selected.length * showtime.price;
  const hasPendingPayment = Boolean(pendingBookingId);

  const book = async () => {
    if (!selected.length || loading) return;
    setLoading(true);
    setError("");
    try {
      const profile = await getUserProfile();
      if (!profile) {
        navigate("/login", { state: { from: `/seats/${showtime.id}` } });
        return;
      }

      const userId = profile.userId;
      await api.lockSeats({ showtimeId: showtime.id, seats: selected, userId });

      const health = await api.health();
      if (health.vnpayEnabled) {
        const { paymentUrl } = await api.createVnpayPayment({
          showtimeId: showtime.id,
          userId,
          seats: selected,
          totalAmount: total,
        });
        window.location.href = paymentUrl;
        return;
      }

      const pending = await api.createMockCheckout({
        showtimeId: showtime.id,
        userId,
        seats: selected,
        totalAmount: total,
      });
      navigate(`/payment/mock?bookingId=${pending.bookingId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      setError(msg);
      if (msg === SHOWTIME_CLOSED_MSG) setClosed(true);
    } finally {
      setLoading(false);
    }
  };

  const onSeatClick = (seat: string) => {
    if (unavailable.has(seat)) return;
    if (selected.includes(seat)) {
      void book();
      return;
    }
    setSelected((prev) => [...prev, seat]);
  };

  const cancelSelection = async () => {
    const seatsToRelease = selected.length ? selected : myReserved;
    if (!seatsToRelease.length && !pendingBookingId) return;

    setLoading(true);
    setError("");
    try {
      const profile = await getUserProfile();
      if (!profile) {
        setError("Please log in to release your seat hold.");
        return;
      }
      await api.releaseSeats({
        showtimeId: showtime.id,
        userId: profile.userId,
        seats: seatsToRelease.length ? seatsToRelease : undefined,
      });
      setSelected([]);
      setMyReserved([]);
      setPendingBookingId(undefined);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not release seats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gv-container gv-page gv-seat-page">
      <div className="gv-breadcrumb">
        <Link to={`/showtimes/${showtime.movieId}`}>← Back to showtimes</Link>
      </div>
      <h1 className="gv-page-title">{showtime.movieTitle}</h1>
      <p className="gv-page-sub">
        {showtime.cinemaName} · {showtime.screenName} ·{" "}
        {new Date(showtime.startsAt).toLocaleString("en-SG")}
      </p>

      <div className="gv-seat-layout">
        <div className="gv-seat-map-panel">
          <div className="gv-screen-bar">SCREEN</div>
          <div className="gv-legend">
            <span>
              <i className="seat-ico free" /> Available
            </span>
            <span>
              <i className="seat-ico sel" /> Selected
            </span>
            <span>
              <i className="seat-ico taken" /> Sold
            </span>
          </div>
          <div className="seat-map" style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }}>
            {seats.map((seat) => {
              const taken = unavailable.has(seat);
              const sel = selected.includes(seat);
              const held = myReserved.includes(seat);
              return (
                <button
                  key={seat}
                  type="button"
                  disabled={taken}
                  className={`seat${sel ? " selected" : ""}${taken ? " taken" : ""}${held && sel ? " held" : ""}`}
                  onClick={() => onSeatClick(seat)}
                >
                  {seat}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="gv-seat-sidebar">
          <h3>Your order</h3>
          {myReserved.length > 0 && (
            <p className="gv-meta">
              {hasPendingPayment
                ? "You have an unfinished payment for these seats. Continue checkout to pay."
                : "These seats are held for your account. Continue checkout within 5 minutes."}
            </p>
          )}
          <p>
            Seats: <strong>{selected.join(", ") || "—"}</strong>
          </p>
          <p className="gv-total">USD {total.toFixed(2)}</p>
          {error && <p className="error">{error}</p>}
          <div className="gv-seat-actions">
            <button
              type="button"
              className="gv-btn-gold gv-btn-block"
              disabled={loading || !selected.length}
              onClick={book}
            >
              {loading ? "Processing…" : hasPendingPayment ? "Continue payment" : "Checkout"}
            </button>
            {(selected.length > 0 || myReserved.length > 0) && (
              <button
                type="button"
                className="gv-btn-outline gv-btn-block"
                disabled={loading}
                onClick={() => void cancelSelection()}
              >
                Hủy chọn chỗ
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
