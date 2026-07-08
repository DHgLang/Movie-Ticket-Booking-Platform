import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Processing payment…");
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState(false);

  const manualSuccess = params.get("success") === "1";
  const manualReason = params.get("reason");
  const manualCode = params.get("code");
  const vnpTxnRef = params.get("vnp_TxnRef");

  useEffect(() => {
    if (manualSuccess) {
      setSuccess(true);
      setMessage("Your ticket is ready.");
      setDone(true);
      return;
    }

    if (manualReason || manualCode) {
      let msg = "Payment was not completed.";
      if (manualReason === "invalid") msg = "Invalid payment response.";
      else if (manualReason === "amount") msg = "Payment amount mismatch.";
      else if (manualCode) msg = `Payment failed (code ${manualCode}).`;
      setMessage(msg);
      setDone(true);
      return;
    }

    if (!vnpTxnRef) {
      setMessage("No payment information found.");
      setDone(true);
      return;
    }

    const vnpParams: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith("vnp_")) vnpParams[key] = value;
    });

    api
      .confirmVnpayPayment(vnpParams)
      .then((res) => {
        setSuccess(true);
        navigate(`/ticket/${res.ticketId}`, { replace: true });
      })
      .catch((e) => {
        setMessage(e instanceof Error ? e.message : "Payment verification failed.");
        setDone(true);
      });
  }, [manualSuccess, manualReason, manualCode, vnpTxnRef, navigate, params]);

  return (
    <div className="gv-container gv-page">
      <div className="gv-ticket-card">
        <h1>{success ? "Payment successful" : done ? "Payment failed" : "Processing…"}</h1>
        {!success && <p className="gv-meta">{message}</p>}
        {done && !success && (
          <Link to="/buy-tickets" className="gv-btn-gold">
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}
