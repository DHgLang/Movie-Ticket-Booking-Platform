import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import type { Voucher } from "../../../../shared/types";

const emptyForm = {
  code: "",
  name: "",
  discountType: "PERCENT" as Voucher["discountType"],
  value: 10,
  startsAt: "2026-01-01",
  endsAt: "2027-12-31",
  isActive: true,
};

/** ISO timestamp → yyyy-MM-dd for <input type="date">. */
function isoToDate(iso: string) {
  return iso.slice(0, 10);
}

function toIsoRange(form: typeof emptyForm) {
  return {
    ...form,
    startsAt: `${form.startsAt}T00:00:00.000Z`,
    endsAt: `${form.endsAt}T23:59:59.000Z`,
  };
}

export default function AdminVouchers() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () =>
    adminApi
      .vouchers()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = toIsoRange(form);
      if (editing) {
        await adminApi.updateVoucher(editing, payload);
      } else {
        await adminApi.createVoucher(payload);
      }
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gv-admin-page">
      <h1>Vouchers</h1>
      <p className="gv-meta">Create and manage movie voucher codes shown on Promotions.</p>
      {error && <p className="error">{error}</p>}

      <form className="gv-admin-form" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Code
          <input
            required
            value={form.code}
            disabled={Boolean(editing)}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
        </label>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          Type
          <select
            value={form.discountType}
            onChange={(e) =>
              setForm((f) => ({ ...f, discountType: e.target.value as Voucher["discountType"] }))
            }
          >
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed USD</option>
          </select>
        </label>
        <label>
          Value
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
          />
        </label>
        <label>
          Starts on
          <input
            type="date"
            required
            value={form.startsAt}
            max={form.endsAt || undefined}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
          />
        </label>
        <label>
          Ends on
          <input
            type="date"
            required
            value={form.endsAt}
            min={form.startsAt || undefined}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          />
        </label>
        <label className="gv-check">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
        <button type="submit" className="gv-btn-gold" disabled={loading}>
          {editing ? "Update voucher" : "Create voucher"}
        </button>
        {editing && (
          <button
            type="button"
            className="gv-btn-outline"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            Cancel edit
          </button>
        )}
      </form>

      <table className="gv-admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Discount</th>
            <th>Valid</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.code}>
              <td>{v.code}</td>
              <td>{v.name}</td>
              <td>{v.discountType === "PERCENT" ? `${v.value}%` : `$${v.value}`}</td>
              <td>
                {new Date(v.startsAt).toLocaleDateString()} –{" "}
                {new Date(v.endsAt).toLocaleDateString()}
              </td>
              <td>{v.isActive ? "Yes" : "No"}</td>
              <td className="gv-admin-actions">
                <button
                  type="button"
                  className="gv-btn-outline"
                  onClick={() => {
                    setEditing(v.code);
                    setForm({
                      code: v.code,
                      name: v.name,
                      discountType: v.discountType,
                      value: v.value,
                      startsAt: isoToDate(v.startsAt),
                      endsAt: isoToDate(v.endsAt),
                      isActive: v.isActive,
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="gv-btn-outline gv-btn-danger"
                  onClick={() =>
                    void adminApi.deleteVoucher(v.code).then(load).catch((e) =>
                      setError(e instanceof Error ? e.message : "Delete failed")
                    )
                  }
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
