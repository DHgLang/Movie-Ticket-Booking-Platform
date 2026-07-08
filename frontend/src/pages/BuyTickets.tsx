import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { fetchPublicCatalog, type CatalogMovie } from "../lib/movieCatalog";
import { cinemaLocations } from "../data/cinemas";

export default function BuyTicketsPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<CatalogMovie[]>([]);
  const [cinema, setCinema] = useState("");
  const [movie, setMovie] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetchPublicCatalog()
      .then((r) => setMovies(r.nowShowing))
      .catch(() => setMovies([]));
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!movie) return;
    navigate(`/showtimes/${movie}?cinema=${cinema}&date=${date}`);
  };

  return (
    <PageShell title="Buy Tickets" subtitle="Spirit Movie — 3 to 5 showtimes per movie, per day.">
      <form className="gv-buy-form" onSubmit={onSubmit}>
        <label>
          Select a Cinema
          <select value={cinema} onChange={(e) => setCinema(e.target.value)} required>
            <option value="">-- Cinemas --</option>
            {cinemaLocations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Select a Movie
          <select value={movie} onChange={(e) => setMovie(e.target.value)} required>
            <option value="">-- Movies --</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          Select Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <button type="submit" className="gv-btn-gold gv-btn-block">
          Find Showtimes
        </button>
      </form>

      <div className="gv-buy-side">
        <h3>Quick Check Purchase</h3>
        <p>Already booked? View your e-ticket from confirmation email or account history.</p>
        <p>
          <Link to="/login">Sign in</Link> to access your tickets.
        </p>
      </div>
    </PageShell>
  );
}
