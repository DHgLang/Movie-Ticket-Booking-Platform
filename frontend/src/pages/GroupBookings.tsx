import { useState, type FormEvent } from "react";
import PageShell from "../components/PageShell";
import { api } from "../lib/api";

export default function GroupBookingsPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      await api.submitGroupBooking(body);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit enquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Group Bookings & Venue Hire"
      subtitle="Private screenings, corporate events and venue rental."
    >
      {sent ? (
        <div className="gv-success-box">
          <h3>Request received</h3>
          <p>Our team will contact you within 2 business days.</p>
        </div>
      ) : (
        <form className="gv-contact-form" onSubmit={(e) => void onSubmit(e)}>
          <label>
            Organisation / Company
            <input name="org" required placeholder="Company name" />
          </label>
          <label>
            Contact person
            <input name="name" required placeholder="Full name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required placeholder="email@company.com" />
          </label>
          <label>
            Expected guests
            <select name="guests" required>
              <option value="">Select range</option>
              <option>20–50</option>
              <option>51–100</option>
              <option>100+</option>
            </select>
          </label>
          <label>
            Event details
            <textarea name="details" rows={4} placeholder="Date, format, catering needs…" />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="gv-btn-gold" disabled={loading}>
            {loading ? "Sending…" : "Submit enquiry"}
          </button>
        </form>
      )}

      <div className="gv-feature-grid" style={{ marginTop: 32 }}>
        <article className="gv-feature-card">
          <h3>Private screening</h3>
          <p>Exclusive auditorium for your group with flexible scheduling.</p>
        </article>
        <article className="gv-feature-card">
          <h3>Corporate venue hire</h3>
          <p>Product launches, town halls and team building at Spirit Movie cinemas.</p>
        </article>
      </div>
    </PageShell>
  );
}
