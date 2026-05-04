import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api/axios";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const sessionId = searchParams.get("session_id");
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!paymentId) return;

    const paymentRequest = sessionId
      ? API.post(
          `/payments/verify-stripe-session/${paymentId}?session_id=${encodeURIComponent(sessionId)}`
        )
      : API.get(`/payments/${paymentId}`);

    paymentRequest
      .then((res) => setPayment(res.data))
      .catch(() => setPayment(null));
  }, [paymentId, sessionId]);

  const isFailed = payment?.payment_status === "FAILED";

  return (
    <div className="card payment-success-card">
      <div className={isFailed ? "failure-hero" : "success-hero"}>
        {isFailed ? "Payment Failed" : "Payment Successful"}
      </div>
      <p>
        {isFailed
          ? "Your payment could not be completed. Please retry checkout."
          : "Your booking is confirmed and your ticket is being prepared."}
      </p>
      {payment && (
        <div className="payment-reference">
          <span>Transaction reference</span>
          <strong>{payment.transaction_id}</strong>
          <span>Amount</span>
          <strong>Rs.{payment.amount}</strong>
        </div>
      )}

      <div className="payment-actions">
        <Link to="/tickets" className="download-btn">
          View My Tickets
        </Link>
        <Link to="/bookings" className="download-btn secondary">
          My Bookings
        </Link>
      </div>
    </div>
  );
}
