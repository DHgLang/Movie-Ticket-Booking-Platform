import { useEffect, useState, type FormEvent } from "react";
import { adminApi } from "../../lib/adminApi";
import { getRumConsoleUrl } from "../../lib/rum";
import type { AdminSettings } from "../../../../shared/types";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<AdminSettings>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    adminApi.settings().then((s) => {
      setForm({
        cloudwatchDashboardUrl: s.cloudwatchDashboardUrl,
        cloudwatchRumConsoleUrl: s.cloudwatchRumConsoleUrl || getRumConsoleUrl(),
      });
    });
  }, []);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    await adminApi.saveSettings(form);
    setMsg("Đã lưu cài đặt");
  };

  return (
    <div className="gv-admin-page">
      <header className="gv-admin-page-head">
        <div>
          <h1>Cài đặt</h1>
        </div>
      </header>

      {msg && <p className="success">{msg}</p>}

      <form className="gv-card gv-form" onSubmit={onSave}>
        <label>
          CloudWatch RUM Console URL
          <input
            value={form.cloudwatchRumConsoleUrl ?? ""}
            onChange={(e) => setForm({ ...form, cloudwatchRumConsoleUrl: e.target.value })}
            placeholder="https://ap-southeast-1.console.aws.amazon.com/cloudwatch/.../rum:..."
          />
        </label>
        <label>
          CloudWatch Dashboard URL
          <input
            value={form.cloudwatchDashboardUrl ?? ""}
            onChange={(e) => setForm({ ...form, cloudwatchDashboardUrl: e.target.value })}
            placeholder="https://ap-southeast-1.console.aws.amazon.com/cloudwatch/home?region=..."
          />
        </label>
        <button type="submit" className="gv-btn-gold">
          Lưu
        </button>
      </form>
    </div>
  );
}
