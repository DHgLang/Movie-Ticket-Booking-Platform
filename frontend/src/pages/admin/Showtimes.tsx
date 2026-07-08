import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "../../lib/adminApi";
import { fetchAdminCatalog } from "../../lib/movieCatalog";
import type { EnrichedShowtime } from "../../lib/api";
import type { Movie, Screen } from "../../../../shared/types";

export default function AdminShowtimes() {
  const [items, setItems] = useState<EnrichedShowtime[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    adminApi.showtimes().then((r) => setItems(r.items));
    fetchAdminCatalog()
      .then((r) => {
        const items = [...r.nowShowing, ...r.comingSoon];
        setMovies(
          items
            .filter((m) => !m.isArchived)
            .map(
              (m) =>
                ({
                  id: m.id,
                  title: m.title,
                  description: m.description,
                  durationMin: m.durationMin,
                  tmdbId: m.tmdbId,
                  status: m.status,
                }) as Movie
            )
        );
      });
    adminApi.cinemas().then((r) => setScreens(r.screens));
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr("");
    try {
      await adminApi.createShowtime({
        movieId: fd.get("movieId"),
        screenId: fd.get("screenId"),
        startsAt: fd.get("startsAt"),
        price: Number(fd.get("price")),
        isSpecial: fd.get("isSpecial") === "on",
      });
      setMsg("Đã tạo suất chiếu");
      e.currentTarget.reset();
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    }
  };

  const toggleSpecial = async (st: EnrichedShowtime) => {
    setErr("");
    try {
      await adminApi.updateShowtime(st.id, { isSpecial: !st.isSpecial });
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Update failed");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Xóa suất chiếu này?")) return;
    setErr("");
    try {
      await adminApi.deleteShowtime(id);
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Delete failed");
    }
  };

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Suất chiếu</h1>
        </div>
      </header>

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      <section className="gv-card">
        <h2>Thêm suất chiếu</h2>
        <form onSubmit={onCreate} className="gv-form">
          <select name="movieId" required>
            <option value="">Phim</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          <select name="screenId" required>
            <option value="">Phòng chiếu</option>
            {screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input name="startsAt" type="datetime-local" required />
          <input name="price" type="number" step="0.5" defaultValue={12} />
          <label className="gv-admin-check">
            <input type="checkbox" name="isSpecial" /> Suất đặc biệt (isSpecial)
          </label>
          <button type="submit" className="gv-btn-gold">
            Tạo suất
          </button>
        </form>
      </section>

      <section className="gv-card">
        <h2>Danh sách ({items.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Phim</th>
              <th>Rạp / Phòng</th>
              <th>Giờ chiếu</th>
              <th>Giá</th>
              <th>Đặc biệt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((st) => (
                <tr key={st.id}>
                  <td>{st.movieTitle}</td>
                  <td>
                    {st.cinemaName} — {st.screenName}
                  </td>
                  <td>{new Date(st.startsAt).toLocaleString("en-SG")}</td>
                  <td>USD {st.price.toFixed(2)}</td>
                  <td>
                    <button type="button" className="gv-btn-outline" onClick={() => toggleSpecial(st)}>
                      {st.isSpecial ? "★ Đặc biệt" : "Thường"}
                    </button>
                  </td>
                  <td>
                    <button type="button" className="gv-btn-outline" onClick={() => onDelete(st.id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
