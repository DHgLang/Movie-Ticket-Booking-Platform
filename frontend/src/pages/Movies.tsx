import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import PageShell from "../components/PageShell";
import { catalogForTab, fetchPublicCatalog, type CatalogMovie } from "../lib/movieCatalog";

export default function MoviesPage() {
  const [params] = useSearchParams();
  const tab = params.get("tab");
  const [movies, setMovies] = useState<CatalogMovie[]>([]);
  const [loading, setLoading] = useState(true);

  const title =
    tab === "soon" ? "Coming Soon" : tab === "advance" ? "Advance Sales" : "Now Showing";

  useEffect(() => {
    setLoading(true);
    fetchPublicCatalog()
      .then((r) => setMovies(catalogForTab(r, tab)))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <PageShell title={title}>
      <div className="gv-tabs" style={{ marginBottom: 24 }}>
        <Link to="/movies" className={`gv-tab${!tab ? " active" : ""}`}>
          Now Showing
        </Link>
        <Link to="/movies?tab=advance" className={`gv-tab${tab === "advance" ? " active" : ""}`}>
          Advance Sales
        </Link>
        <Link to="/movies?tab=soon" className={`gv-tab${tab === "soon" ? " active" : ""}`}>
          Coming Soon
        </Link>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : movies.length === 0 ? (
        <p className="gv-meta">Chưa có phim trong danh mục này.</p>
      ) : (
        <div className="gv-movie-grid">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
