import { Link } from "react-router-dom";

export default function PaymentSuccessPage() {
  return (
    <div className="card payment-success-card">
      <div className="success-hero">Payment Successful</div>
      <p>Your booking is confirmed and your ticket is being prepared.</p>
      <p>Check your tickets page for access details, or review your booking history.</p>

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