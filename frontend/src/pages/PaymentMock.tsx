import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { getUserProfile } from "../lib/auth";

export default function PaymentMockPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = params.get("bookingId") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <h1>Mock payment (local dev)</h1>
        <p className="gv-meta">Booking: {bookingId}</p>
        <p>Simulate VNPay — pay to get your ticket, or leave to release your seat hold.</p>
        {error && <p className="error">{error}</p>}
        <div className="gv-seat-actions" style={{ marginTop: 20 }}>
          <button
            type="button"
            className="gv-btn-gold gv-btn-block"
            disabled={loading}
            onClick={() => void pay()}
          >
            {loading ? "Processing…" : "Pay now (mock)"}
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
