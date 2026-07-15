import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminApi } from "../../lib/adminApi";
import { tmdb, type TmdbMovie } from "../../lib/tmdb";
import {
  catalogIsNowShowing,
  fetchAdminCatalog,
  type CatalogMovie,
} from "../../lib/movieCatalog";
import { MOVIE_LOCKABLE_FIELDS, statusLabel } from "../../../../shared/movieHelpers";

type AdminTab = "now" | "soon";

type NowFormState = {
  title: string;
  durationMin: number;
  rating: string;
  genre: string;
  releaseDate: string;
  trailerUrl: string;
  director: string;
  cast: string;
  distributorSharePct: number;
  lockedFields: string[];
};

type SoonFormState = {
  description: string;
};

type CreateFormState = {
  title: string;
  description: string;
  durationMin: number;
  rating: string;
  genre: string;
  releaseDate: string;
};

function emptyNowForm(): NowFormState {
  return {
    title: "",
    durationMin: 120,
    rating: "PG-13",
    genre: "",
    releaseDate: "",
    trailerUrl: "",
    director: "",
    cast: "",
    distributorSharePct: 50,
    lockedFields: [],
  };
}

function emptySoonForm(): SoonFormState {
  return { description: "" };
}

function emptyCreateForm(): CreateFormState {
  return {
    title: "",
    description: "",
    durationMin: 120,
    rating: "PG-13",
    genre: "",
    releaseDate: "",
  };
}

function nowMovieToForm(m: CatalogMovie): NowFormState {
  return {
    title: m.title,
    durationMin: m.durationMin,
    rating: m.rating ?? "PG-13",
    genre: m.genre ?? "",
    releaseDate: m.releaseDate ?? "",
    trailerUrl: m.trailerUrl ?? "",
    director: m.director ?? "",
    cast: (m.cast ?? []).join(", "),
    distributorSharePct: m.distributorSharePct ?? 50,
    lockedFields: m.lockedFields ?? [],
  };
}

export default function AdminMovies() {
  const [nowShowing, setNowShowing] = useState<CatalogMovie[]>([]);
  const [comingSoon, setComingSoon] = useState<CatalogMovie[]>([]);
  const [listTab, setListTab] = useState<AdminTab>("now");
  const [archivedView, setArchivedView] = useState(false);
  const [search, setSearch] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbMovie[]>([]);
  const [editing, setEditing] = useState<CatalogMovie | null>(null);
  const [nowForm, setNowForm] = useState<NowFormState>(emptyNowForm());
  const [soonForm, setSoonForm] = useState<SoonFormState>(emptySoonForm());
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm());
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const movies = archivedView
    ? [...nowShowing, ...comingSoon]
    : listTab === "now"
      ? nowShowing
      : comingSoon;

  const load = useCallback(() => {
    fetchAdminCatalog(archivedView)
      .then((r) => {
        setNowShowing(r.nowShowing);
        setComingSoon(r.comingSoon);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [archivedView]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setTmdbResults([]);
      return;
    }
    const t = setTimeout(() => {
      tmdb
        .search(search.trim())
        .then((r) => setTmdbResults(r.results.slice(0, 6)))
        .catch(() => setTmdbResults([]));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openEdit = (m: CatalogMovie) => {
    setEditing(m);
    setCreating(false);
    if (catalogIsNowShowing(m)) setNowForm(nowMovieToForm(m));
    else setSoonForm({ description: m.description });
    setMsg("");
    setErr("");
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setCreateForm(emptyCreateForm());
    setMsg("");
    setErr("");
  };

  const toggleLock = (field: string) => {
    setNowForm((f) => ({
      ...f,
      lockedFields: f.lockedFields.includes(field)
        ? f.lockedFields.filter((x) => x !== field)
        : [...f.lockedFields, field],
    }));
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      if (creating) {
        await adminApi.createMovie({
          ...createForm,
          status: "COMING_SOON",
        });
        setMsg("Đã tạo phim (Coming Soon)");
      } else if (editing) {
        if (catalogIsNowShowing(editing)) {
          await adminApi.updateMovie(editing.id, {
            ...nowForm,
            tmdbId: editing.tmdbId,
            cast: nowForm.cast
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          });
          setMsg("Đã cập nhật Now Showing");
        } else {
          await adminApi.updateMovie(editing.id, {
            description: soonForm.description,
            tmdbId: editing.tmdbId,
            title: editing.title,
          });
          setMsg("Đã cập nhật giới thiệu Coming Soon");
        }
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Save failed");
    }
  };

  const onImport = async (tmdbId: number) => {
    setErr("");
    try {
      await adminApi.importTmdb(tmdbId);
      setMsg(`Đã import TMDB #${tmdbId}`);
      setSearch("");
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Import failed");
    }
  };

  const onArchive = async (id: string) => {
    if (!confirm("Lưu trữ phim này? Phim sẽ ẩn khỏi trang khách nhưng giữ dữ liệu thống kê.")) return;
    setErr("");
    try {
      await adminApi.archiveMovie(id);
      setMsg("Đã lưu trữ phim");
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Archive failed");
    }
  };

  const onPoster = async (id: string, file: File) => {
    setErr("");
    try {
      await adminApi.uploadPoster(id, file);
      setMsg("Đã upload poster");
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    }
  };

  const editingNow = editing ? catalogIsNowShowing(editing) : false;
  const editingSoon = editing ? !catalogIsNowShowing(editing) : false;

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Quản lý danh mục phim</h1>
        </div>
        <div className="gv-admin-filters">
          <button
            type="button"
            className={!archivedView ? "gv-btn-gold" : "gv-btn-outline"}
            onClick={() => setArchivedView(false)}
          >
            Đang hoạt động
          </button>
          <button
            type="button"
            className={archivedView ? "gv-btn-gold" : "gv-btn-outline"}
            onClick={() => setArchivedView(true)}
          >
            Đã lưu trữ
          </button>
          <button type="button" className="gv-btn-outline" onClick={openCreate}>
            + Tạo phim (Coming Soon)
          </button>
        </div>
      </header>

      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      {!archivedView && (
        <div className="gv-tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`gv-tab${listTab === "now" ? " active" : ""}`}
            onClick={() => setListTab("now")}
          >
            Now Showing ({nowShowing.length})
          </button>
          <button
            type="button"
            className={`gv-tab${listTab === "soon" ? " active" : ""}`}
            onClick={() => setListTab("soon")}
          >
            Coming Soon ({comingSoon.length})
          </button>
        </div>
      )}

      <section className="gv-card">
        <h2>Import từ TMDB</h2>
        <input
          placeholder="Tìm phim trên TMDB..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {tmdbResults.length > 0 && (
          <ul className="gv-admin-tmdb-list">
            {tmdbResults.map((m) => (
              <li key={m.id}>
                <span>
                  {m.title} · ★ {m.vote_average.toFixed(1)}
                </span>
                <button type="button" className="gv-btn-gold" onClick={() => onImport(m.id)}>
                  Import
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="gv-admin-movie-grid">
        {movies.map((m) => {
          const isNow = catalogIsNowShowing(m);
          return (
            <article key={m.id} className="gv-admin-movie-card">
              <div className="gv-poster-wrap">
                {m.posterUrl ? (
                  <img src={m.posterUrl} alt={m.title} />
                ) : (
                  <div className="gv-poster-empty">No poster</div>
                )}
                <span className={`gv-admin-badge gv-admin-badge-${m.status}`}>
                  {statusLabel(m.status)}
                </span>
              </div>
              <h3>{m.title}</h3>
              <p className="gv-movie-meta">
                {m.tmdbId ? `★ ${(m.voteAverage ?? 0).toFixed(1)} · ` : ""}
                {m.durationMin} phút · {m.rating}
                {m.tmdbId ? ` · TMDB ${m.tmdbId}` : ""}
              </p>
              <div className="gv-admin-card-actions">
                <button type="button" className="gv-btn-outline" onClick={() => openEdit(m)}>
                  {isNow ? "Sửa" : "Sửa giới thiệu"}
                </button>
                {isNow && !m.isArchived && (
                  <label className="gv-btn-outline gv-upload-btn">
                    Poster
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onPoster(m.id, f);
                      }}
                    />
                  </label>
                )}
                {!m.isArchived && (
                  <button type="button" className="gv-btn-outline" onClick={() => onArchive(m.id)}>
                    Lưu trữ
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {(editing || creating) && (
        <section className="gv-card">
          <h2>
            {creating
              ? "Tạo phim mới (Coming Soon)"
              : editingNow
                ? `Sửa Now Showing: ${editing?.title}`
                : `Sửa giới thiệu: ${editing?.title}`}
          </h2>
          <form className="gv-form gv-admin-movie-form" onSubmit={onSave}>
            {creating && (
              <>
                <input
                  placeholder="Tên phim"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Giới thiệu phim"
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
                <div className="gv-admin-form-row">
                  <input
                    type="number"
                    placeholder="Thời lượng (phút)"
                    value={createForm.durationMin}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, durationMin: Number(e.target.value) })
                    }
                  />
                  <input
                    placeholder="Độ tuổi (PG-13...)"
                    value={createForm.rating}
                    onChange={(e) => setCreateForm({ ...createForm, rating: e.target.value })}
                  />
                  <input
                    placeholder="Thể loại"
                    value={createForm.genre}
                    onChange={(e) => setCreateForm({ ...createForm, genre: e.target.value })}
                  />
                </div>
                <input
                  type="date"
                  value={createForm.releaseDate}
                  onChange={(e) => setCreateForm({ ...createForm, releaseDate: e.target.value })}
                />
              </>
            )}

            {editingNow && (
              <>
                <input
                  placeholder="Tên phim"
                  value={nowForm.title}
                  onChange={(e) => setNowForm({ ...nowForm, title: e.target.value })}
                  required
                />
                <p className="gv-meta">
                  Tab: <strong>{statusLabel(editing?.status)}</strong> (theo ★ TMDB, không đổi
                  thủ công)
                </p>
                <div className="gv-admin-form-row">
                  <input
                    type="number"
                    placeholder="Thời lượng (phút)"
                    value={nowForm.durationMin}
                    onChange={(e) => setNowForm({ ...nowForm, durationMin: Number(e.target.value) })}
                  />
                  <input
                    placeholder="Độ tuổi (PG-13...)"
                    value={nowForm.rating}
                    onChange={(e) => setNowForm({ ...nowForm, rating: e.target.value })}
                  />
                  <input
                    placeholder="Thể loại"
                    value={nowForm.genre}
                    onChange={(e) => setNowForm({ ...nowForm, genre: e.target.value })}
                  />
                </div>
                <div className="gv-admin-form-row">
                  <input
                    type="date"
                    value={nowForm.releaseDate}
                    onChange={(e) => setNowForm({ ...nowForm, releaseDate: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="% NH phát hành"
                    value={nowForm.distributorSharePct}
                    onChange={(e) =>
                      setNowForm({ ...nowForm, distributorSharePct: Number(e.target.value) })
                    }
                  />
                </div>
                <input
                  placeholder="Trailer URL (YouTube)"
                  value={nowForm.trailerUrl}
                  onChange={(e) => setNowForm({ ...nowForm, trailerUrl: e.target.value })}
                />
                <input
                  placeholder="Đạo diễn"
                  value={nowForm.director}
                  onChange={(e) => setNowForm({ ...nowForm, director: e.target.value })}
                />
                <input
                  placeholder="Diễn viên (cách nhau bởi dấu phẩy)"
                  value={nowForm.cast}
                  onChange={(e) => setNowForm({ ...nowForm, cast: e.target.value })}
                />
                <fieldset className="gv-admin-locks">
                  <legend>Lock field (không ghi đè khi Re-sync TMDB)</legend>
                  <div className="gv-admin-lock-grid">
                    {MOVIE_LOCKABLE_FIELDS.map((field) => (
                      <label key={field}>
                        <input
                          type="checkbox"
                          checked={nowForm.lockedFields.includes(field)}
                          onChange={() => toggleLock(field)}
                        />
                        {field}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {editingSoon && (
              <textarea
                placeholder="Giới thiệu phim (hiển thị trang khách & suất chiếu)"
                rows={6}
                value={soonForm.description}
                onChange={(e) => setSoonForm({ description: e.target.value })}
                required
              />
            )}

            <div className="gv-admin-form-row">
              <button type="submit" className="gv-btn-gold">
                {creating ? "Tạo phim" : "Cập nhật"}
              </button>
              <button
                type="button"
                className="gv-btn-outline"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                Hủy
              </button>
              {editing?.tmdbId && (
                <button
                  type="button"
                  className="gv-btn-outline"
                  onClick={() => onImport(editing.tmdbId!)}
                >
                  Re-sync TMDB
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
