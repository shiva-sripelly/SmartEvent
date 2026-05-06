import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import API from "../api/axios";

export default function PaymentCheckoutPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id");
  const cancelled = searchParams.get("status") === "cancelled";

  const [bookings, setBookings] = useState([]);
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState(cancelled ? "Payment was cancelled. You can try again." : "");
  const [isProcessing, setIsProcessing] = useState(false);

  const booking = useMemo(
    () => bookings.find((item) => String(item.id) === String(bookingId)),
    [bookings, bookingId]
  );

  useEffect(() => {
    const loadCheckout = async () => {
      const bookingRes = await API.get("/bookings/my-bookings");
      setBookings(bookingRes.data);

      if (paymentId) {
        const paymentRes = await API.get(`/payments/${paymentId}`);
        setPayment(paymentRes.data);
      }
    };

    loadCheckout().catch(() => setMessage("Unable to load checkout details."));
  }, [bookingId, paymentId]);

  const simulatePayment = async (succeed) => {
    setIsProcessing(true);
    setMessage("");

    try {
      const res = await API.post("/payments/simulate", {
        booking_id: Number(bookingId),
        payment_method: "SIMULATED_CARD",
        succeed,
      });

      setPayment(res.data);
      if (res.data.payment_status === "SUCCESS") {
        navigate(`/payment-success?payment_id=${res.data.id}`);
      } else {
        setMessage("Payment failed. Please try again.");
      }
    } catch (err) {
      setMessage(err.response?.data?.detail || "Payment could not be processed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const payWithStripe = async () => {
    if (!paymentId) {
      setMessage("Payment session is missing. Please start checkout again.");
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const res = await API.post(`/payments/${paymentId}/stripe-checkout`);

      if (res.data.checkout_url.includes("/checkout/")) {
        setMessage(res.data.message || "Stripe is not configured. Use simulated checkout.");
      } else {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      setMessage(err.response?.data?.detail || "Unable to open Stripe checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!booking) {
    return (
      <div className="checkout-shell">
        <div className="checkout-panel skeleton-panel">Loading checkout...</div>
      </div>
    );
  }

  const finalAmount = booking.final_amount ?? booking.total_price;

  return (
    <div className="checkout-shell">
      <section className="checkout-panel">
        <div>
          <p className="eyebrow-text">Secure checkout</p>
          <h2>Complete your payment</h2>
          <p className="subtle-text">Booking #{booking.id}</p>
        </div>

        <div className="summary-block">
          <div>
            <span>Tickets</span>
            <strong>{booking.ticket_quantity}</strong>
          </div>
          <div>
            <span>Booking total</span>
            <strong>Rs.{booking.total_price}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>Rs.{booking.discount_amount || 0}</strong>
          </div>
          <div className="summary-total">
            <span>Payable amount</span>
            <strong>Rs.{finalAmount}</strong>
          </div>
        </div>

        {payment && (
          <div className={`payment-state ${payment.payment_status.toLowerCase()}`}>
            Payment status: {payment.payment_status}
          </div>
        )}

        {message && <div className="error-text">{message}</div>}

        <div className="checkout-actions">
          <button
            className="bms-book-btn"
            onClick={payWithStripe}
            disabled={isProcessing || booking.booking_status === "CONFIRMED"}
          >
            {isProcessing ? "Processing..." : "Pay with Stripe"}
          </button>
          <button
            className="ghost-btn"
            onClick={() => simulatePayment(true)}
            disabled={isProcessing || booking.booking_status === "CONFIRMED"}
          >
            Pay with Test Card
          </button>
          <button
            className="ghost-btn"
            onClick={() => simulatePayment(false)}
            disabled={isProcessing || booking.booking_status === "CONFIRMED"}
          >
            Simulate Failure
          </button>
        </div>

        <Link to="/bookings" className="download-btn secondary">
          Back to bookings
        </Link>
      </section>
    </div>
  );
}
