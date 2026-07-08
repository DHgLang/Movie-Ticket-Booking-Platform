import PageShell from "../components/PageShell";

export default function GoldClassPage() {
  return (
    <PageShell
      title="GOLD CLASS"
      subtitle="Premium cinema experience with luxury reclining seats and exclusive lounge."
    >
      <div className="gv-feature-grid">
        <article className="gv-feature-card">
          <h3>Gold Class Express</h3>
          <p>Reclining leather seats, personalised service, and gourmet menu delivered to your seat.</p>
          <ul>
            <li>Wider seating pitch</li>
            <li>Priority entry</li>
            <li>Complimentary popcorn upgrade</li>
          </ul>
        </article>
        <article className="gv-feature-card gv-feature-dark">
          <h3>Gold Class Deluxe</h3>
          <p>Our finest auditorium with Dolby Atmos and butler-style dining.</p>
          <p className="gv-price-tag">From 28 USD / ticket</p>
        </article>
      </div>
      <p className="gv-note">* Demo content styled after Golden Village Singapore.</p>
    </PageShell>
  );
}
