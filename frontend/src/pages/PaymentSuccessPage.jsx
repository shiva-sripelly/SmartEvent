import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function PaymentSuccessPage() {
  const { t } = useLanguage();
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
        {isFailed ? t("paymentFailedTitle") : t("paymentSuccessful")}
      </div>
      <p>
        {isFailed
          ? t("paymentFailureCopy")
          : t("paymentSuccessCopy")}
      </p>
      {payment && (
        <div className="payment-reference">
          <span>{t("transactionReference")}</span>
          <strong>{payment.transaction_id}</strong>
          <span>{t("amount")}</span>
          <strong>Rs.{payment.amount}</strong>
        </div>
      )}

      <div className="payment-actions">
        <Link to="/tickets" className="download-btn">
          {t("viewMyTickets")}
        </Link>
        <Link to="/bookings" className="download-btn secondary">
          {t("myBookings")}
        </Link>
      </div>
    </div>
  );
}





