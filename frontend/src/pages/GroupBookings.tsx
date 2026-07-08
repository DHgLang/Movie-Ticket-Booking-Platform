import { useState, type FormEvent } from "react";
import PageShell from "../components/PageShell";

export default function GroupBookingsPage() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
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
        <form className="gv-contact-form" onSubmit={onSubmit}>
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
          <button type="submit" className="gv-btn-gold">
            Submit enquiry
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
          <p>Product launches, town halls and team building at GV cinemas.</p>
        </article>
      </div>
    </PageShell>
  );
}
