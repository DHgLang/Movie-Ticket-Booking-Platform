import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { getRumConsoleUrl } from "../../lib/rum";
import type { AdminSettings, TrafficMetrics } from "../../../../shared/types";

export default function AdminTraffic() {
  const [settings, setSettings] = useState<AdminSettings>({});
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null);
  const [err, setErr] = useState("");
  const [days, setDays] = useState(7);

  const rumUrl = settings.cloudwatchRumConsoleUrl?.trim() || getRumConsoleUrl();

  useEffect(() => {
    adminApi.settings().then(setSettings).catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    setErr("");
    adminApi
      .trafficMetrics(days)
      .then(setMetrics)
      .catch((e) => setErr(e instanceof Error ? e.message : "Load failed"));
  }, [days]);

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Web Traffic & API</h1>
        </div>
        <div className="gv-admin-filters">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={days === d ? "gv-btn-gold" : "gv-btn-outline"}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </header>

      {err && <p className="error">{err}</p>}

      {metrics && (
        <>
          <div className="gv-admin-kpis">
            <div className="gv-admin-kpi">
              <span>Page views (RUM)</span>
              <strong>{metrics.summary.pageViews}</strong>
            </div>
            <div className="gv-admin-kpi">
              <span>API requests</span>
              <strong>{metrics.summary.apiRequests}</strong>
            </div>
            <div className="gv-admin-kpi">
              <span>Lambda invocations</span>
              <strong>{metrics.summary.lambdaInvocations}</strong>
            </div>
            <div className="gv-admin-kpi">
              <span>Lambda errors</span>
              <strong>{metrics.summary.lambdaErrors}</strong>
            </div>
          </div>

          <div className="gv-admin-grid">
            <section className="gv-card">
              <h2>Page views / ngày (RUM)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.pageViewsByDay.map((r) => (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                  {metrics.pageViewsByDay.length === 0 && (
                    <tr>
                      <td colSpan={2}>Chưa có dữ liệu RUM — deploy sandbox và mở site vài lần.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="gv-card">
              <h2>API requests / ngày</h2>
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.apiRequestsByDay.map((r) => (
                    <tr key={r.date}>
                      <td>{r.date}</td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
                  {metrics.apiRequestsByDay.length === 0 && (
                    <tr>
                      <td colSpan={2}>Chưa có request API trong khoảng này.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}

      {(rumUrl || settings.cloudwatchDashboardUrl) && (
        <section className="gv-card gv-admin-note">
          {rumUrl && (
            <a href={rumUrl} target="_blank" rel="noreferrer">
              Mở CloudWatch RUM →
            </a>
          )}
          {rumUrl && settings.cloudwatchDashboardUrl && " · "}
          {settings.cloudwatchDashboardUrl && (
            <a href={settings.cloudwatchDashboardUrl} target="_blank" rel="noreferrer">
              Mở CloudWatch Dashboard →
            </a>
          )}
        </section>
      )}
    </div>
  );
}
