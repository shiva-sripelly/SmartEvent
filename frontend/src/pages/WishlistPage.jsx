import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";
import { getSafeImageUrl } from "../utils/imageUrl";
import { isEventCancelled, isEventExpired, isEventUnavailable } from "../utils/eventStatus";

export default function WishlistPage() {
  const { language, t } = useLanguage();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await API.get("/wishlist/");
      setWishlist(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const removeFromWishlist = async (eventId) => {
    await API.delete(`/wishlist/${eventId}`);
    setWishlist((items) => items.filter((item) => item.event_id !== eventId));
  };

  return (
    <div className="events-layout w-full px-4 md:px-8 overflow-x-hidden">
      <section className="events-main w-full max-w-[1400px] mx-auto">
        <div className="page-header-row">
          <div>
            <h2>{t("myWishlist")}</h2>
            <p className="subtle-text">
              {t("wishlistSubtitle")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="premium-event-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="premium-event-card skeleton-card">
                <div className="poster-wrap"></div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="card empty-state">
            <h4>{t("noSavedEvents")}</h4>
            <p>{t("wishlistEmptyHelp")}</p>
          </div>
        ) : (
          <div className="premium-event-grid">
            {wishlist.map((item) => {
              const event = item.event;
              const bannerImage = getSafeImageUrl(event.banner_image);
              const isExpired = isEventExpired(event);
              const isCancelled = isEventCancelled(event);
              const isUnavailable = isEventUnavailable(event);

              return (
                <div className="premium-event-card" key={item.id}>
                  <div className="poster-wrap">
                    <button
                      type="button"
                      className="wishlist-button saved"
                      onClick={() => removeFromWishlist(event.id)}
                      aria-label={t("removeFromWishlist", { title: event.title })}
                      title={t("removeFromWishlist", { title: event.title })}
                    >
                      {"\u2665"}
                    </button>

                    {bannerImage ? (
                      <img src={bannerImage} alt={event.title} />
                    ) : (
                      <div className="event-image-fallback">
                        <span>{event.category || event.title}</span>
                      </div>
                    )}

                    {isExpired && <span className="expired-badge">{t("expired")}</span>}
                    {isCancelled && (
                      <span className="cancelled-badge">{t("cancelled")}</span>
                    )}

                    <span className="date-badge">
                      {new Date(event.event_date).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}
                    </span>
                  </div>

                  <h3>{event.title}</h3>
                  <p className="venue">{event.location}</p>
                  <p className="category">{event.category}</p>
                  <h4>Rs.{event.ticket_price}</h4>

                  <div className="wishlist-card-actions">
                    {!isUnavailable ? (
                      <Link to={`/events/${event.id}`}>{t("bookNow")}</Link>
                    ) : (
                      <span className="expired-text">
                        {isCancelled ? t("cancelled") : t("expired")}
                      </span>
                    )}

                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => removeFromWishlist(event.id)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}





