import { Link } from "react-router-dom";

export default function EventCard({ event }) {
  const isExpired = event.status === "COMPLETED";
  const isCancelled = event.status === "CANCELLED";

  return (
    <div className={`premium-event-card ${isExpired || isCancelled ? "expired-card" : ""}`}>
      <div className="poster-wrap">
        <img
          src={
            event.banner_image ||
            "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4"
          }
          alt={event.title}
        />

        {isExpired && <span className="expired-badge">Expired</span>}
        {isCancelled && <span className="cancelled-badge">Cancelled</span>}

        <span className="date-badge">
          {new Date(event.event_date).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <h3>{event.title}</h3>
      <p className="venue">{event.location}</p>
      <p className="category">{event.category}</p>
      <h4>₹{event.ticket_price} onwards</h4>

      {!isExpired && !isCancelled ? (
        <Link to={`/events/${event.id}`}>View Details</Link>
      ) : (
        <span className="expired-text">
          {isCancelled ? "Cancelled" : "Booking Closed"}
        </span>
      )}
    </div>
  );
}