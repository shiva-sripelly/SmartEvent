import { useEffect, useState } from "react";
import API from "../api/axios";

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const res = await API.get("/bookings/my-bookings");
      setBookings(res.data);
    };

    fetchBookings();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2>My Bookings</h2>
          <p className="subtle-text">Review your confirmed tickets and booking status.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card empty-state">
          <h4>No bookings yet</h4>
          <p>Once a booking is confirmed, it will appear here with status details.</p>
        </div>
      ) : (
        bookings.map((b) => (
          <div className="card booking-card" key={b.id}>
            <div className="booking-card-header">
              <div>
                <h4>Booking #{b.id}</h4>
                <p className="category">Event ID: {b.event_id}</p>
              </div>
              <span className={`status-pill ${b.booking_status.toLowerCase()}`}>
                {b.booking_status}
              </span>
            </div>

            <div className="booking-row">
              <div>
                <p className="label">Tickets</p>
                <strong>{b.ticket_quantity}</strong>
              </div>
              <div>
                <p className="label">Total Paid</p>
                <strong>₹{b.total_price}</strong>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}