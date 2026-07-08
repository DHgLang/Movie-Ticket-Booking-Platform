import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

export default function TicketPage() {
  const { bookingId } = useParams();
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (!bookingId) return;
    api.ticketQr(bookingId).then((r) => setQr(r.qrPayload)).catch(() => setQr(`TICKET:${bookingId}`));
  }, [bookingId]);

  return (
    <div className="gv-container gv-page">
      <div className="gv-ticket-card">
        <h1>E-Ticket</h1>
        <p className="gv-meta">Booking ref: {bookingId}</p>
        <div className="qr-box">{qr || "…"}</div>
        <p>Present this QR code at the cinema entrance.</p>
        <Link to="/" className="gv-btn-gold">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
