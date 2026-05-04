import { useEffect, useState } from "react";
import API from "../api/axios";

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const res = await API.get("/bookings/my-bookings");
      setBookings(
        [...res.data].sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0) ||
            b.id - a.id
        )
      );
    };

    fetchBookings();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2>My Bookings</h2>
          <p className="subtle-text">Review your tickets, payment totals, and booking status.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card empty-state">
          <h4>No bookings yet</h4>
          <p>Once a booking is created, it will appear here with status details.</p>
        </div>
      ) : (
        bookings.map((b) => {
          const isCancelled = b.event_status === "CANCELLED";
          const isExpired =
            !isCancelled &&
            (b.event_status === "COMPLETED" ||
              (b.event_date && new Date(b.event_date) < new Date()));
          const bookingStatus = isCancelled
            ? "CANCELLED"
            : isExpired
            ? "EXPIRED"
            : b.booking_status;

          return (
          <div className="card booking-card" key={b.id}>
            <div className="booking-card-header">
              <div>
                <h4>Booking #{b.id}</h4>
                <p className="category">Event ID: {b.event_id}</p>
              </div>
              <span className={`status-pill ${bookingStatus.toLowerCase()}`}>
                {bookingStatus}
              </span>
            </div>

            <div className="booking-row">
              <div>
                <p className="label">Tickets</p>
                <strong>{b.ticket_quantity}</strong>
              </div>
              <div>
                <p className="label">Subtotal</p>
                <strong>Rs.{b.total_price}</strong>
              </div>
              <div>
                <p className="label">Discount</p>
                <strong>Rs.{b.discount_amount || 0}</strong>
              </div>
              <div>
                <p className="label">Final Paid</p>
                <strong>Rs.{b.final_amount ?? b.total_price}</strong>
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
