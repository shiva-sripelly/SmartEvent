import { Link } from "react-router-dom";
import useLanguage from "../context/useLanguage";
import { getSafeImageUrl } from "../utils/imageUrl";
import { isEventCancelled, isEventExpired } from "../utils/eventStatus";

export default function EventCard({ event }) {
  const { language, t } = useLanguage();
  const isExpired = isEventExpired(event);
  const isCancelled = isEventCancelled(event);
  const bannerImage =
    getSafeImageUrl(event.banner_image) ||
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4";

  return (
    <div className={`premium-event-card ${isExpired || isCancelled ? "expired-card" : ""}`}>
      <div className="poster-wrap">
        <img src={bannerImage} alt={event.title} />

        {isExpired && <span className="expired-badge">{t("expired")}</span>}
        {isCancelled && <span className="cancelled-badge">{t("cancelled")}</span>}

        <span className="date-badge">
          {new Date(event.event_date).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      <h3>{event.title}</h3>
      <p className="venue">{event.location}</p>
      <p className="category">{event.category}</p>
      <h4>₹{event.ticket_price} {t("onwards")}</h4>

      {!isExpired && !isCancelled ? (
        <Link to={`/events/${event.id}`}>{t("viewDetails")}</Link>
      ) : (
        <span className="expired-text">
          {isCancelled ? t("cancelled") : t("expired")}
        </span>
      )}
    </div>
  );
}


