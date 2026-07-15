import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { api } from "../lib/api";
import { getUserProfile, logout, type UserProfile } from "../lib/auth";

type BookingRow = Awaited<ReturnType<typeof api.myBookings>>["items"][number];

export default function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(true)
      .then(async (p) => {
        if (!p) {
          navigate("/login", { replace: true });
          return;
        }
        setProfile(p);
        try {
          const res = await api.myBookings(p.userId);
          setBookings(res.items);
        } catch {
          setBookings([]);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
    window.location.reload();
  };

  if (loading) {
    return (
      <PageShell title="My Account" subtitle="Loading…">
        <p>Please wait…</p>
      </PageShell>
    );
  }

  if (!profile) return null;

  return (
    <PageShell title="My Account" subtitle="Spirit Movie membership & settings.">
      <div className="gv-account-grid">
        <section className="gv-card">
          <h2>Profile</h2>
          <dl className="gv-account-dl">
            <dt>Email</dt>
            <dd>{profile.email}</dd>
            <dt>User ID</dt>
            <dd className="gv-mono">{profile.userId}</dd>
            <dt>Role</dt>
            <dd>{profile.isAdmin ? "Administrator" : "Member"}</dd>
          </dl>
        </section>

        <section className="gv-card">
          <h2>Order history</h2>
          {bookings.length === 0 ? (
            <p className="gv-meta">No bookings yet.</p>
          ) : (
            <ul className="gv-order-list">
              {bookings.map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>{b.movieTitle ?? b.showtimeId}</strong>
                    <div className="gv-meta">
                      {b.status} · USD {b.totalAmount.toFixed(2)} · {b.seats.join(", ")}
                    </div>
                  </div>
                  {b.ticketId && (
                    <Link to={`/ticket/${b.ticketId}`} className="gv-btn-outline">
                      View ticket
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="gv-card">
          <h2>Quick links</h2>
          <div className="gv-account-actions">
            <Link to="/buy-tickets" className="gv-btn-gold">
              Buy Tickets
            </Link>
            <Link to="/vouchers" className="gv-btn-outline">
              Gift Cards
            </Link>
            {profile.isAdmin && (
              <Link to="/admin" className="gv-btn-outline">
                Admin Panel
              </Link>
            )}
            <button type="button" className="gv-btn-outline gv-btn-danger" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
