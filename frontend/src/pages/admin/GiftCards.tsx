import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { adminApi } from "../../lib/adminApi";
import type { GiftCard, GiftCardTransaction } from "../../../../shared/types";

export default function AdminGiftCards() {
  const [items, setItems] = useState<GiftCard[]>([]);
  const [history, setHistory] = useState<GiftCardTransaction[]>([]);
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [balance, setBalance] = useState(50);
  const [note, setNote] = useState("");
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () =>
    adminApi
      .giftCards()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));

  useEffect(() => {
    void load();
  }, []);

  const loadHistory = async (cardCode: string) => {
    setSelected(cardCode);
    try {
      const res = await adminApi.giftCardHistory(cardCode);
      setHistory(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "History failed");
    }
  };

  const issue = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminApi.issueGiftCard({
        code: code.trim() || undefined,
        balance,
        issuedBy: "admin",
        note: note || undefined,
      });
      setCode("");
      setNote("");
      setBalance(50);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gv-admin-page">
      <h1>Gift Cards</h1>
      <p className="gv-meta">Issue balance gift cards, lock/unlock, adjust balance, view history.</p>
      {error && <p className="error">{error}</p>}

      <form className="gv-admin-form" onSubmit={(e) => void issue(e)}>
        <label>
          Code (optional)
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Auto if empty" />
        </label>
        <label>
          Initial balance (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
          />
        </label>
        <label>
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="gv-btn-gold" disabled={loading}>
          Issue gift card
        </button>
      </form>

      <table className="gv-admin-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Balance</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((card) => (
            <tr key={card.code}>
              <td>{card.code}</td>
              <td>USD {card.balance.toFixed(2)}</td>
              <td>{card.status}</td>
              <td className="gv-admin-actions">
                <button type="button" className="gv-btn-outline" onClick={() => void loadHistory(card.code)}>
                  History
                </button>
                {card.status === "ACTIVE" ? (
                  <button
                    type="button"
                    className="gv-btn-outline"
                    onClick={() =>
                      void adminApi.lockGiftCard(card.code).then(load).catch((e) =>
                        setError(e instanceof Error ? e.message : "Lock failed")
                      )
                    }
                  >
                    Lock
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gv-btn-outline"
                    onClick={() =>
                      void adminApi.unlockGiftCard(card.code).then(load).catch((e) =>
                        setError(e instanceof Error ? e.message : "Unlock failed")
                      )
                    }
                  >
                    Unlock
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <section className="gv-card" style={{ marginTop: 24 }}>
          <h2>Adjust / history — {selected}</h2>
          <div className="gv-admin-actions" style={{ marginBottom: 12 }}>
            <input
              type="number"
              step="0.01"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(Number(e.target.value))}
              placeholder="Delta amount"
            />
            <button
              type="button"
              className="gv-btn-outline"
              onClick={() =>
                void adminApi
                  .adjustGiftCard(selected, { amount: adjustAmount, actor: "admin" })
                  .then(() => load())
                  .then(() => loadHistory(selected))
                  .catch((e) => setError(e instanceof Error ? e.message : "Adjust failed"))
              }
            >
              Apply adjust
            </button>
          </div>
          <ul>
            {history.map((tx) => (
              <li key={tx.id}>
                {tx.createdAt} · {tx.type} · {tx.amount} · {tx.actor}
                {tx.bookingId ? ` · booking ${tx.bookingId}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
