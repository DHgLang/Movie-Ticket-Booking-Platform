import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import type { Booking } from "../../../shared/types";

export default function TicketPage() {
  const { bookingId } = useParams();
  const [qr, setQr] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    api
      .getTicket(bookingId)
      .then((r) => {
        setQr(r.ticket.qrCode);
        setBooking(r.booking ?? null);
      })
      .catch(() => setQr(`TICKET:${bookingId}`));
  }, [bookingId]);

  return (
    <div className="gv-container gv-page">
      <div className="gv-ticket-card">
        <h1>E-Ticket</h1>
        <p className="gv-meta">Booking ref: {booking?.id ?? bookingId}</p>
        <div className="qr-box qr-box--image">
          {qr ? <QRCodeSVG value={qr} size={196} marginSize={2} /> : "…"}
        </div>
        {booking && (
          <div className="gv-ticket-details">
            <p>
              Seats: <strong>{booking.seats.join(", ")}</strong>
            </p>
            {typeof booking.subtotalAmount === "number" && (
              <p className="gv-meta">Subtotal: USD {booking.subtotalAmount.toFixed(2)}</p>
            )}
            {booking.discountAmount ? (
              <p className="gv-meta">
                Voucher {booking.voucherCode}: −USD {booking.discountAmount.toFixed(2)}
              </p>
            ) : null}
            {booking.giftCardAmount ? (
              <p className="gv-meta">
                Gift card {booking.giftCardCode}: −USD {booking.giftCardAmount.toFixed(2)}
              </p>
            ) : null}
            <p>
              Paid: <strong>USD {booking.totalAmount.toFixed(2)}</strong>
            </p>
          </div>
        )}
        <p>Present this QR code at the cinema entrance.</p>
        <Link to="/" className="gv-btn-gold">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
