import { Link } from "react-router-dom";
import type { CatalogMovie } from "../lib/movieCatalog";

type Props = { movie: CatalogMovie };

export default function MovieCard({ movie }: Props) {
  const meta =
    movie.voteAverage != null
      ? `★ ${movie.voteAverage.toFixed(1)}`
      : [movie.rating, movie.genre].filter(Boolean).join(" · ");

  return (
    <Link to={`/showtimes/${movie.id}`} className="gv-movie-card">
      <div className="gv-poster-wrap">
        {movie.posterUrl ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" />
        ) : (
          <div className="gv-poster-empty">No image</div>
        )}
      </div>
      <h3 className="gv-movie-title">{movie.title}</h3>
      {meta && <p className="gv-movie-meta">{meta}</p>}
    </Link>
  );
}
