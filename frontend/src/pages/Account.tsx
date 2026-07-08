import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getUserProfile, logout, type UserProfile } from "../lib/auth";

export default function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile(true)
      .then((p) => {
        if (!p) {
          navigate("/login", { replace: true });
          return;
        }
        setProfile(p);
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

        <section className="gv-card gv-plan-card">
          <h2>Current plan</h2>
          <p className="gv-plan-name">{profile.plan}</p>
          <ul className="gv-plan-features">
            {profile.isAdmin ? (
              <>
                <li>Book tickets at all cinemas</li>
                <li>Admin panel — manage movies & showtimes</li>
                <li>View all bookings</li>
              </>
            ) : (
              <>
                <li>Book tickets online</li>
                <li>E-ticket & QR check-in</li>
                <li>Order history</li>
              </>
            )}
          </ul>
          {!profile.isAdmin && (
            <p className="gv-meta">Upgrade to Gold Class at any cinema counter.</p>
          )}
        </section>

        <section className="gv-card">
          <h2>Quick links</h2>
          <div className="gv-account-actions">
            <Link to="/buy-tickets" className="gv-btn-gold">
              Buy Tickets
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
