import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import type { RevenueReport } from "../../../../shared/types";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const [range, setRange] = useState<"day" | "week" | "month">("day");
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [err, setErr] = useState("");

  const { from, to } = useMemo(() => {
    const end = todayKey();
    if (range === "month") return { from: daysAgo(30), to: end };
    if (range === "week") return { from: daysAgo(7), to: end };
    return { from: end, to: end };
  }, [range]);

  useEffect(() => {
    setErr("");
    adminApi
      .revenueReport({ from, to, groupBy: range === "day" ? "day" : range })
      .then(setReport)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [from, to, range]);

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Báo cáo & Thống kê</h1>
        </div>
        <div className="gv-admin-filters">
          {(["day", "week", "month"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={range === r ? "gv-btn-gold" : "gv-btn-outline"}
              onClick={() => setRange(r)}
            >
              {r === "day" ? "Hôm nay" : r === "week" ? "7 ngày" : "30 ngày"}
            </button>
          ))}
        </div>
      </header>

      {err && <p className="error">{err}</p>}

      {report && (
        <>
          <div className="gv-admin-kpis">
            <div className="gv-admin-kpi">
              <span>Doanh thu</span>
              <strong>USD {report.summary.total.toFixed(2)}</strong>
            </div>
            <div className="gv-admin-kpi">
              <span>Bookings</span>
              <strong>{report.summary.bookings}</strong>
            </div>
            <div className="gv-admin-kpi">
              <span>Vé</span>
              <strong>{report.summary.tickets}</strong>
            </div>
          </div>

          <section className="gv-card">
            <h2>Doanh thu theo {range === "day" ? "ngày" : range === "week" ? "tuần" : "tháng"}</h2>
            <table>
              <thead>
                <tr>
                  <th>Kỳ</th>
                  <th>Doanh thu</th>
                  <th>Bookings</th>
                  <th>Vé</th>
                </tr>
              </thead>
              <tbody>
                {report.byPeriod.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>USD {row.total.toFixed(2)}</td>
                    <td>{row.bookings}</td>
                    <td>{row.tickets}</td>
                  </tr>
                ))}
                {report.byPeriod.length === 0 && (
                  <tr>
                    <td colSpan={4}>Chưa có dữ liệu trong khoảng thời gian này.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <div className="gv-admin-grid">
            <section className="gv-card">
              <h2>Theo phim (ăn chia NH phát hành)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Phim</th>
                    <th>Doanh thu</th>
                    <th>% NHPH</th>
                    <th>Tiền NHPH</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMovie.map((row) => (
                    <tr key={row.movieId}>
                      <td>{row.movieTitle}</td>
                      <td>USD {row.total.toFixed(2)}</td>
                      <td>{row.sharePct}%</td>
                      <td>USD {row.distributorAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="gv-card">
              <h2>Theo rạp</h2>
              <table>
                <thead>
                  <tr>
                    <th>Rạp</th>
                    <th>Doanh thu</th>
                    <th>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCinema.map((row) => (
                    <tr key={row.cinemaId}>
                      <td>{row.cinemaName}</td>
                      <td>USD {row.total.toFixed(2)}</td>
                      <td>{row.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
