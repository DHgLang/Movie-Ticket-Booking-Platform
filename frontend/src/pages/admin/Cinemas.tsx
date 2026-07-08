import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import type { Cinema, Screen } from "../../../../shared/types";

export default function AdminCinemas() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);

  useEffect(() => {
    adminApi.cinemas().then((r) => {
      setCinemas(r.items);
      setScreens(r.screens);
    });
  }, []);

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Rạp chiếu</h1>
        </div>
      </header>

      {cinemas.map((c) => (
        <section key={c.id} className="gv-card">
          <h2>{c.name}</h2>
          <p>
            {c.address}, {c.city}
          </p>
          <ul>
            {screens
              .filter((s) => s.cinemaId === c.id)
              .map((s) => (
                <li key={s.id}>
                  {s.name} — {s.rows}×{s.cols} ghế
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
