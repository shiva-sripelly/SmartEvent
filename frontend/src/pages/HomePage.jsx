import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";
import { getSafeImageUrl } from "../utils/imageUrl";
import { isEventActive, isEventCancelled, isEventExpired } from "../utils/eventStatus";

const categories = ["Music", "Tech", "Sports", "Business", "Comedy", "Workshops"];

export default function HomePage() {
  const { language, t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [filters, setFilters] = useState({
    title: "",
    category: "",
    location: "",
    start_date: "",
    end_date: "",
  });
  const [filterType, setFilterType] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_asc");
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState([]);

  const fetchEvents = async (nextFilters = filters) => {
    setLoading(true);

    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) {
        params.append(
          key,
          key.includes("date") ? new Date(value).toISOString() : value
        );
      }
    });

    const res = await API.get(`/events/advanced-search/?${params.toString()}`);
    setEvents(res.data);
    setLoading(false);
  };

  const updateFilter = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    return nextFilters;
  };

  const resetFilters = () => {
    const nextFilters = {
      title: "",
      category: "",
      location: "",
      start_date: "",
      end_date: "",
    };

    setFilters(nextFilters);
    setSortBy("date_asc");
    setFilterType("ALL");
    fetchEvents(nextFilters);
  };

  const fetchWishlist = async () => {
    try {
      const res = await API.get("/wishlist/");
      setWishlistIds(res.data.map((item) => item.event_id));
    } catch {
      setWishlistIds([]);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const [recommendedRes, trendingRes] = await Promise.all([
        API.get("/recommendations/personalized"),
        API.get("/recommendations/trending"),
      ]);

      setRecommendedEvents(recommendedRes.data);
      setTrendingEvents(trendingRes.data);
    } catch (err) {
      console.error("Unable to load recommendations:", err);
      setRecommendedEvents([]);
      setTrendingEvents([]);
    }
  };

  const toggleWishlist = async (eventId) => {
    const isSaved = wishlistIds.includes(eventId);

    try {
      if (isSaved) {
        await API.delete(`/wishlist/${eventId}`);
        setWishlistIds((currentIds) =>
          currentIds.filter((savedId) => savedId !== eventId)
        );
      } else {
        await API.post(`/wishlist/${eventId}`);
        setWishlistIds((currentIds) => [...currentIds, eventId]);
      }
    } catch (err) {
      console.error("Unable to update wishlist:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchWishlist();
    fetchRecommendations();
  }, []);

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (filterType === "ACTIVE") {
        return isEventActive(event);
      }
      if (filterType === "CANCELLED") {
        return isEventCancelled(event);
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.event_date) - new Date(b.event_date);
      if (sortBy === "date_desc") return new Date(b.event_date) - new Date(a.event_date);
      if (sortBy === "price_low") return a.ticket_price - b.ticket_price;
      if (sortBy === "price_high") return b.ticket_price - a.ticket_price;
      if (sortBy === "popularity") return (b.average_rating || 0) - (a.average_rating || 0);
      return 0;
    });
  }, [events, filterType, sortBy]);

  const renderRecommendationCard = (event) => {
    const bannerImage = getSafeImageUrl(event.banner_image);

    return (
      <Link className="trend-card" to={`/events/${event.id}`} key={event.id}>
        {bannerImage ? (
          <img src={bannerImage} alt={event.title} />
        ) : (
          <div className="event-image-fallback">
            <span>{event.category || event.title}</span>
          </div>
        )}

        <div className="trend-overlay">
          <h4>{event.title}</h4>
          <p>{event.category} • {event.location}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="events-layout w-full px-4 md:px-8 overflow-x-hidden">

      <section className="events-main w-full max-w-[1400px] mx-auto">

        {/* HERO */}
        <section className="discovery-hero flex items-center">
          <div>
            <p className="eyebrow-text">{t("discoverLiveExperiences")}</p>
            <h1>{t("heroTitle")}</h1>
            <p>
              {t("heroSubtitle")}
            </p>
          </div>
        </section>

        {/* SEARCH */}
        <div className="search-box module16-search">
          <input
            placeholder={t("searchEvents")}
            value={filters.title}
            onChange={(e) => updateFilter("title", e.target.value)}
          />

          <select
            value={filters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            placeholder={t("location")}
            value={filters.location}
            onChange={(e) => updateFilter("location", e.target.value)}
          />

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => updateFilter("start_date", e.target.value)}
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => updateFilter("end_date", e.target.value)}
          />

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date_asc">Date ↑</option>
            <option value="date_desc">Date ↓</option>
            <option value="popularity">{t("popularity")}</option>
            <option value="price_low">{t("priceLow")}</option>
            <option value="price_high">{t("priceHigh")}</option>
          </select>

          <div className="module16-action-group">
            <button className="admin-quick-link module16-search-btn" onClick={() => fetchEvents()}>
              {t("search")}
            </button>
            <button className="admin-nav-link module16-clear-btn" onClick={resetFilters}>
              {t("clear")}
            </button>
          </div>
        </div>

        {/* FILTER */}
        <div className="filter-actions">
          <button
            className={`admin-quick-link ${filterType === "ALL" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("ALL")}
          >
            {t("all")}
          </button>
          <button
            className={`admin-quick-link ${filterType === "ACTIVE" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("ACTIVE")}
          >
            {t("active")}
          </button>
          <button
            className={`admin-quick-link ${filterType === "CANCELLED" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("CANCELLED")}
          >
            {t("cancelled")}
          </button>
        </div>

        {recommendedEvents.length > 0 && (
          <section className="recommendation-section">
            <div className="recommendation-heading">
              <h2 className="section-title">{t("recommendedForYou")}</h2>
              <span>{recommendedEvents.length} {t("picks")}</span>
            </div>
            <div className="trending-carousel">
              {recommendedEvents.map(renderRecommendationCard)}
            </div>
          </section>
        )}

        {trendingEvents.length > 0 && (
          <section className="recommendation-section">
            <div className="recommendation-heading">
              <h2 className="section-title">{t("trendingEvents")}</h2>
              <span>{t("popularNow")}</span>
            </div>
            <div className="trending-carousel">
              {trendingEvents.map(renderRecommendationCard)}
            </div>
          </section>
        )}

        {/* EVENTS */}
        <div className="premium-event-grid">
  {loading ? (
    Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="premium-event-card skeleton-card">
        <div className="poster-wrap"></div>
      </div>
    ))
  ) : visibleEvents.length === 0 ? (
    <div className="card empty-state">
      <h4>{t("noEventsFound")}</h4>
      <p>{t("tryChangingFilters")}</p>
    </div>
  ) : (
    visibleEvents.map((event) => {
      const isExpired = isEventExpired(event);
      const isCancelled = isEventCancelled(event);
      const bannerImage = getSafeImageUrl(event.banner_image);
      const isWishlisted = wishlistIds.includes(event.id);

      return (
        <div className="premium-event-card" key={event.id}>
          <div className="poster-wrap">
            <button
              type="button"
              className={`wishlist-button ${isWishlisted ? "saved" : ""}`}
              onClick={() => toggleWishlist(event.id)}
              aria-label={
                isWishlisted
                  ? t("removeFromWishlist", { title: event.title })
                  : t("saveToWishlist", { title: event.title })
              }
              title={isWishlisted ? t("removeFromWishlist", { title: event.title }) : t("saveEvent")}
            >
              {isWishlisted ? "\u2665" : "\u2661"}
            </button>

            {bannerImage ? (
              <img src={bannerImage} alt={event.title} />
            ) : (
              <div className="event-image-fallback">
                <span>{event.category || event.title}</span>
              </div>
            )}

            {isExpired && <span className="expired-badge">{t("expired")}</span>}
            {isCancelled && <span className="cancelled-badge">{t("cancelled")}</span>}

            <span className="date-badge">
              {new Date(event.event_date).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN")}
            </span>
          </div>

          <h3>{event.title}</h3>
          <p className="venue">{event.location}</p>
          <p className="category">{event.category}</p>
          <h4>₹{event.ticket_price}</h4>

          {!isExpired && !isCancelled ? (
            <Link to={`/events/${event.id}`}>{t("viewDetails")}</Link>
          ) : (
            <span className="expired-text">
              {isCancelled ? t("cancelled") : t("expired")}
            </span>
          )}
        </div>
      );
    })
  )}
</div>

      </section>
    </div>
  );
}



