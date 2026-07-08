import PageShell from "../components/PageShell";

const vouchers = [
  { name: "GV e-Gift Card 50", value: "50", type: "Digital" },
  { name: "GV e-Gift Card 100", value: "100", type: "Digital" },
  { name: "Movie Voucher (2D)", value: "13.50", type: "Physical" },
  { name: "Gold Class Voucher", value: "28", type: "Premium" },
];

export default function VouchersPage() {
  return (
    <PageShell
      title="Movie Vouchers & Gift Cards"
      subtitle="Purchase gift cards and movie vouchers — styled after gv.com.sg/GVVouchersAndGiftCards"
    >
      <div className="gv-voucher-grid">
        {vouchers.map((v) => (
          <article key={v.name} className="gv-voucher-card">
            <div className="gv-voucher-visual">
              <span>GV</span>
              <strong>USD {v.value}</strong>
            </div>
            <h3>{v.name}</h3>
            <p className="gv-meta">{v.type}</p>
            <button type="button" className="gv-btn-gold">
              Buy Now
            </button>
          </article>
        ))}
      </div>
      <div className="gv-info-box">
        <h3>Redeem at checkout</h3>
        <p>Enter voucher code on the payment page when booking tickets online.</p>
      </div>
    </PageShell>
  );
}
