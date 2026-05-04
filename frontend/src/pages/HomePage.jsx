import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";

const categories = ["Music", "Tech", "Sports", "Business", "Comedy", "Workshops"];

export default function HomePage() {
  const [events, setEvents] = useState([]);
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

  useEffect(() => {
    fetchEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (filterType === "ACTIVE") {
        return ["UPCOMING", "ONGOING"].includes(event.status);
      }
      if (filterType === "CANCELLED") {
        return event.status === "CANCELLED";
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

  return (
    <div className="events-layout w-full px-4 md:px-8 overflow-x-hidden">

      <section className="events-main w-full max-w-[1400px] mx-auto">

        {/* HERO */}
        <section className="discovery-hero flex items-center">
          <div>
            <p className="eyebrow-text">Discover live experiences</p>
            <h1>Find events worth showing up for.</h1>
            <p>
              Search by category, location, date, price, and what people are booking most.
            </p>
          </div>
        </section>

        {/* SEARCH */}
        <div className="search-box module16-search">
          <input
            placeholder="Search events..."
            value={filters.title}
            onChange={(e) => updateFilter("title", e.target.value)}
          />

          <select
            value={filters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            placeholder="Location"
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
            <option value="popularity">Popularity</option>
            <option value="price_low">Price Low</option>
            <option value="price_high">Price High</option>
          </select>

          <div className="module16-action-group">
            <button className="admin-quick-link module16-search-btn" onClick={() => fetchEvents()}>
              Search
            </button>
            <button className="admin-nav-link module16-clear-btn" onClick={resetFilters}>
              Clear
            </button>
          </div>
        </div>

        {/* FILTER */}
        <div className="filter-actions">
          <button
            className={`admin-quick-link ${filterType === "ALL" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("ALL")}
          >
            All
          </button>
          <button
            className={`admin-quick-link ${filterType === "ACTIVE" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("ACTIVE")}
          >
            Active
          </button>
          <button
            className={`admin-quick-link ${filterType === "CANCELLED" ? "module16-active-btn" : ""}`}
            onClick={() => setFilterType("CANCELLED")}
          >
            Cancelled
          </button>
        </div>

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
      <h4>No events found</h4>
      <p>Try changing filters</p>
    </div>
  ) : (
    visibleEvents.map((event) => {
      const isExpired = event.status === "COMPLETED";
      const isCancelled = event.status === "CANCELLED";

      return (
        <div className="premium-event-card" key={event.id}>
          <div className="poster-wrap">
            <img src={event.banner_image} alt={event.title} />

            {isExpired && <span className="expired-badge">Expired</span>}
            {isCancelled && <span className="cancelled-badge">Cancelled</span>}

            <span className="date-badge">
              {new Date(event.event_date).toLocaleDateString("en-IN")}
            </span>
          </div>

          <h3>{event.title}</h3>
          <p className="venue">{event.location}</p>
          <p className="category">{event.category}</p>
          <h4>₹{event.ticket_price}</h4>

          {!isExpired && !isCancelled ? (
            <Link to={`/events/${event.id}`}>View Details</Link>
          ) : (
            <span className="expired-text">
              {isCancelled ? "Cancelled" : "Closed"}
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
