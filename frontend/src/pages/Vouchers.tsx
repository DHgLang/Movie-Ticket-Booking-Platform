import { useState } from "react";
import PageShell from "../components/PageShell";
import { api } from "../lib/api";

export default function VouchersPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ code: string; balance: number; status: string } | null>(
    null
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const check = async () => {
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const card = await api.getGiftCard(value);
      setResult(card);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gift card not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Movie Vouchers & Gift Cards"
      subtitle="Check gift card balances and apply codes during ticket checkout."
    >
      <div className="gv-card" style={{ maxWidth: 520 }}>
        <h2>Check gift card balance</h2>
        <p className="gv-meta">
          Demo cards: <strong>GIFT100</strong>, <strong>GIFT25</strong>. Admins issue and lock cards
          from the Admin Panel.
        </p>
        <label className="gv-field">
          Gift card code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter gift card code"
          />
        </label>
        <button type="button" className="gv-btn-gold" disabled={loading || !code.trim()} onClick={() => void check()}>
          {loading ? "Checking…" : "Check balance"}
        </button>
        {error && <p className="error">{error}</p>}
        {result && (
          <div className="gv-success-box" style={{ marginTop: 16 }}>
            <p>
              Code: <strong>{result.code}</strong>
            </p>
            <p>
              Balance: <strong>USD {result.balance.toFixed(2)}</strong>
            </p>
            <p>
              Status: <strong>{result.status}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="gv-feature-grid" style={{ marginTop: 28 }}>
        <article className="gv-feature-card">
          <h3>Movie vouchers</h3>
          <p>
            Browse active codes on the Promotions page, then paste one voucher at seat checkout.
          </p>
        </article>
        <article className="gv-feature-card">
          <h3>Gift cards</h3>
          <p>
            Balance-based cards can be combined with one voucher. Remaining amount is paid via mock
            payment / VNPay.
          </p>
        </article>
      </div>
    </PageShell>
  );
}
