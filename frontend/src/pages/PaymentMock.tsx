import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { getUserProfile } from "../lib/auth";
import type { Booking } from "../../../shared/types";

const METHODS = [
  { id: "vnpay-qr", label: "VNPay QR", desc: "Scan with your banking app", icon: "▦" },
  { id: "atm", label: "ATM Card (Domestic)", desc: "NAPAS domestic debit card", icon: "▭" },
  { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, JCB", icon: "💳" },
];

export default function PaymentMockPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = params.get("bookingId") ?? "";
  const [booking, setBooking] = useState<Booking | null>(null);
  const [method, setMethod] = useState(METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    api
      .getTicket(bookingId)
      .then((r) => setBooking(r.booking ?? null))
      .catch(() => setBooking(null));
  }, [bookingId]);

  const pay = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError("");
    try {
      const profile = await getUserProfile();
      if (!profile) {
        navigate("/login", { state: { from: `/payment/mock?bookingId=${bookingId}` } });
        return;
      }
      const res = await api.confirmMockPayment({ bookingId, userId: profile.userId });
      navigate(`/ticket/${res.ticketId}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const leave = async () => {
    if (!bookingId) {
      navigate("/buy-tickets", { replace: true });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const profile = await getUserProfile();
      if (profile) {
        await api.cancelMockCheckout({ bookingId, userId: profile.userId });
      }
      navigate("/buy-tickets", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="gv-container gv-page">
        <div className="gv-ticket-card">
          <h1>Invalid payment link</h1>
          <Link to="/buy-tickets" className="gv-btn-gold">
            Buy tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gv-container gv-page">
      <div className="gv-ticket-card">
        <h1>Checkout</h1>
        <p className="gv-meta">Booking: {bookingId}</p>

        {booking && (
          <div className="gv-pay-summary">
            <div className="gv-pay-row">
              <span>Seats {booking.seats.join(", ")}</span>
              <span>USD {(booking.subtotalAmount ?? booking.totalAmount).toFixed(2)}</span>
            </div>
            {booking.discountAmount ? (
              <div className="gv-pay-row gv-pay-row--discount">
                <span>Voucher {booking.voucherCode}</span>
                <span>−USD {booking.discountAmount.toFixed(2)}</span>
              </div>
            ) : null}
            {booking.giftCardAmount ? (
              <div className="gv-pay-row gv-pay-row--discount">
                <span>Gift card {booking.giftCardCode}</span>
                <span>−USD {booking.giftCardAmount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="gv-pay-row gv-pay-row--total">
              <span>Total</span>
              <span>USD {booking.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="gv-pay-methods">
          {METHODS.map((m) => (
            <label
              key={m.id}
              className={`gv-pay-method${method === m.id ? " gv-pay-method--active" : ""}`}
            >
              <input
                type="radio"
                name="pay-method"
                value={m.id}
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
              />
              <span className="gv-pay-method-icon" aria-hidden>
                {m.icon}
              </span>
              <span className="gv-pay-method-text">
                <strong>{m.label}</strong>
                <small>{m.desc}</small>
              </span>
            </label>
          ))}
        </div>

        <p className="gv-meta">
          Local dev — payment is simulated, no real charge is made.
        </p>
        {error && <p className="error">{error}</p>}
        <div className="gv-seat-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="gv-btn-gold gv-btn-block"
            disabled={loading}
            onClick={() => void pay()}
          >
            {loading
              ? "Processing…"
              : `Pay${booking ? ` USD ${booking.totalAmount.toFixed(2)}` : " now"}`}
          </button>
          <button
            type="button"
            className="gv-btn-outline gv-btn-block"
            disabled={loading}
            onClick={() => void leave()}
          >
            Leave without paying
          </button>
        </div>
      </div>
    </div>
  );
}
