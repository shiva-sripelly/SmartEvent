import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import EventCard from "../components/EventCard";
const categories = ["Music", "Tech", "Sports", "Business", "Comedy", "Workshops"];

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [filterType, setFilterType] = useState("ACTIVE");
  const fetchEvents = async () => {
    const res = await API.get("/events/");
    setEvents(res.data);
    setActiveCategory("");
  };

  const handleSearch = async () => {
    if (!search.trim()) return fetchEvents();
    const res = await API.get(`/events/search/?title=${search}`);
    setEvents(res.data);
  };

  const filterCategory = async (category) => {
    setActiveCategory(category);
    const res = await API.get(`/events/category/${category}`);
    setEvents(res.data);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="events-layout">
      <aside className="filter-sidebar">
        <div className="filter-box">
          <div className="filter-title">
            <span>Categories</span>
            <button onClick={fetchEvents}>Clear</button>
          </div>

          <div className="category-list">
            {categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? "active-category" : ""}
                onClick={() => filterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="events-main">
        <div className="search-box premium-search">
          <input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={handleSearch}>Search</button>
        </div>
         <div className="filter-toggle">
  <button
    className={filterType === "ACTIVE" ? "active-toggle" : ""}
    onClick={() => setFilterType("ACTIVE")}
  >
    Active
  </button>

  <button
    className={filterType === "ALL" ? "active-toggle" : ""}
    onClick={() => setFilterType("ALL")}
  >
    All
  </button>

  <button
    className={filterType === "CANCELLED" ? "active-toggle" : ""}
    onClick={() => setFilterType("CANCELLED")}
  >
    Cancelled
  </button>
</div>
        <div className="premium-event-grid">
          {events
  .filter((event) => {
    if (filterType === "ACTIVE")
      return (
        event.status === "ACTIVE" &&
        new Date(event.event_date) > new Date()
      );

    if (filterType === "CANCELLED")
      return event.status === "CANCELLED" || event.status === "INACTIVE";

    return event.status !== "CANCELLED" && event.status !== "INACTIVE";
  })
  .map((event) => {
            const isExpired =
              event.status === "EXPIRED" ||
              new Date(event.event_date) < new Date();
            const isCancelled =
              event.status === "CANCELLED" || event.status === "INACTIVE";

            return (
              <div
                className={`premium-event-card ${
                  isExpired || isCancelled ? "expired-card" : ""
                }`}
                key={event.id}
              >
                <div className="poster-wrap">
                  <img
                    src={
                      event.banner_image ||
                      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4"
                    }
                    alt={event.title}
                  />

                  {/* Expired Badge */}
                  {isExpired && <span className="expired-badge">Expired</span>}

                  {/* Cancelled / Inactive Badge */}
                  {isCancelled && (
                    <span className="cancelled-badge">Cancelled</span>
                  )}

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
          })}
        </div>
      </section>
    </div>
  );
}