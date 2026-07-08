import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { fetchPublicCatalog, type CatalogMovie } from "../lib/movieCatalog";

export default function HomePage() {
  const [nowShowing, setNowShowing] = useState<CatalogMovie[]>([]);
  const [comingSoon, setComingSoon] = useState<CatalogMovie[]>([]);
  const [featured, setFeatured] = useState<CatalogMovie | null>(null);

  useEffect(() => {
    fetchPublicCatalog()
      .then((r) => {
        setNowShowing(r.nowShowing);
        setComingSoon(r.comingSoon);
        setFeatured(r.nowShowing[0] ?? null);
      })
      .catch(() => {
        setNowShowing([]);
        setComingSoon([]);
        setFeatured(null);
      });
  }, []);

  const bg = featured?.backdropUrl || featured?.posterUrl || "";

  return (
    <>
      <section className="gv-hero" style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
        <div className="gv-hero-overlay" />
        <div className="gv-container gv-hero-inner">
          {featured && (
            <>
              <p className="gv-hero-eyebrow">Now Showing</p>
              <h1>{featured.title}</h1>
              <Link to={`/showtimes/${featured.id}`} className="gv-btn-gold">
                Buy Tickets
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="gv-container gv-section">
        <div className="gv-tabs">
          <span className="gv-tab active">Now Showing</span>
          <Link to="/movies?tab=advance" className="gv-tab">
            Advance Sales
          </Link>
          <Link to="/movies?tab=soon" className="gv-tab">
            Coming Soon
          </Link>
        </div>
        <div className="gv-movie-grid">
          {nowShowing.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
        <Link to="/movies" className="gv-view-all">
          View All Movies →
        </Link>
      </section>

      <section className="gv-container gv-section gv-section-alt">
        <h2 className="gv-section-title">Coming Soon</h2>
        <div className="gv-movie-grid">
          {comingSoon.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      </section>

      <section className="gv-quickbuy gv-container">
        <h2>Quick Buy</h2>
        <p>Select cinema, movie and showtime — or use full Buy Tickets page.</p>
        <Link to="/buy-tickets" className="gv-btn-gold">
          Go to Buy Tickets
        </Link>
      </section>
    </>
  );
}
