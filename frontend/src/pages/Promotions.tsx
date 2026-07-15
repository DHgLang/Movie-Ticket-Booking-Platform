import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { api } from "../lib/api";
import type { Voucher } from "../../../shared/types";

export default function PromotionsPage() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPromotions()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load promotions"));
  }, []);

  return (
    <PageShell
      title="Promotions"
      subtitle="Active movie vouchers available to select at checkout."
    >
      {error && <p className="error">{error}</p>}
      {!error && items.length === 0 && <p className="gv-meta">No active promotions right now.</p>}
      <div className="gv-promo-grid">
        {items.map((promo) => (
          <article key={promo.code} className="gv-promo-card">
            <h3>{promo.name}</h3>
            <p>
              {promo.discountType === "PERCENT"
                ? `${promo.value}% off`
                : `USD ${promo.value.toFixed(2)} off`}
            </p>
            <p className="gv-meta">
              Valid {new Date(promo.startsAt).toLocaleDateString()} –{" "}
              {new Date(promo.endsAt).toLocaleDateString()}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
