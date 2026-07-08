import PageShell from "../components/PageShell";
import { cinemaLocations, cinemaMapQuery } from "../data/cinemas";

export default function CinemasPage() {
  return (
    <PageShell title="Cinemas" subtitle="Find a cinema near you.">
      <div className="gv-cinema-list">
        {cinemaLocations.map((c) => (
          <article key={c.id} className="gv-cinema-card">
            <div className="gv-cinema-info">
              <h3>{c.name}</h3>
              <p className="gv-cinema-rating">
                <span className="gv-star">★</span> {c.rating.toFixed(1)}
                <span className="gv-dot">•</span>
                Movie theater
              </p>
              <p className="gv-cinema-address">
                <strong>Address:</strong> {c.address}, {c.city}
              </p>
              <p className="gv-cinema-meta">
                <strong>Chain:</strong> {c.halls} screens
                <span className="gv-dot">•</span>
                {c.tags}
              </p>
              <p className="gv-cinema-meta">
                <strong>Hotline:</strong> {c.phone}
              </p>
              <div className="gv-cinema-links">
                {c.website && (
                  <a href={c.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
                <span className="gv-dot">•</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinemaMapQuery(c))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinemaMapQuery(c))}`}
              target="_blank"
              rel="noreferrer"
              className="gv-btn-outline"
            >
              Get directions
            </a>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
