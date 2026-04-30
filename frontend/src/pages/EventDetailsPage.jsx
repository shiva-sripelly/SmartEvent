import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";

export default function EventDetailsPage() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      const res = await API.get(`/events/${id}`);
      setEvent(res.data);
    };

    fetchEvent();
  }, [id]);

  const handlePayment = async () => {
    try {
      const res = await API.post(
        `/payments/create-checkout-session?event_id=${id}&quantity=${quantity}`
      );

      window.location.href = res.data.checkout_url;
    } catch (err) {
      setMessage(err.response?.data?.detail || "Payment failed");
    }
  };

  if (!event) return <h2>Loading event details...</h2>;

  const isExpired = event.status === "COMPLETED";
  const isCancelled = event.status === "CANCELLED";
  const eventDate = new Date(event.event_date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const eventTime = new Date(event.event_date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bms-detail-page">
      <h1 className="bms-detail-title">{event.title}</h1>

      <div className="bms-detail-layout">
        <div className="bms-poster-box">
          <img src={event.banner_image} alt={event.title} />
        </div>

        <aside className="bms-booking-card">
          <div className="bms-info-row">
            <span>📅</span>
            <p>{eventDate}</p>
          </div>

          <div className="bms-info-row">
            <span>🕒</span>
            <p>{eventTime}</p>
          </div>

          <div className="bms-info-row">
            <span>🏷️</span>
            <p>{event.category}</p>
          </div>

          <div className="bms-info-row">
            <span>📍</span>
            <p>{event.location}</p>
          </div>

          <div className="bms-info-row">
            <span>🎟️</span>
            <p>{event.available_tickets} tickets available</p>
          </div>

          <div className="bms-divider"></div>

          <div className="bms-price-row">
            <div>
              <h3>₹{event.ticket_price}</h3>
              <p>{isExpired ? "Booking Closed" : "Available"}</p>
            </div>

            <div className="bms-quantity">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                max={event.available_tickets}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isExpired}
              />
            </div>
          </div>

          <button
            className="bms-book-btn"
            onClick={handlePayment}
            disabled={isExpired || isCancelled}
          >
            {isCancelled
    ? "Event Cancelled"
    : isExpired
    ? "Booking Closed"
    : "Book Now"}
</button>

          {message && <div className="success-message">{message}</div>}
        </aside>
      </div>

      <section className="bms-about-section">
        <h2>About the event</h2>
        <p>{event.description}</p>
      </section>
    </div>
  );
}