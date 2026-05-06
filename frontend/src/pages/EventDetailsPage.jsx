import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getSafeImageUrl } from "../utils/imageUrl";
import { isEventCancelled, isEventExpired } from "../utils/eventStatus";

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    average_rating: 0,
    reviews_count: 0,
  });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [liveTickets, setLiveTickets] = useState(null);
  const [eventUpdates, setEventUpdates] = useState([]);

  const fetchReviews = async () => {
    const [reviewRes, summaryRes] = await Promise.all([
      API.get(`/reviews/event/${id}`),
      API.get(`/reviews/event/${id}/summary`),
    ]);

    setReviews(reviewRes.data);
    setReviewSummary(summaryRes.data);
  };

  const fetchEventUpdates = async () => {
    const res = await API.get(`/event-updates/event/${id}`);
    setEventUpdates(res.data);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      API.get(`/events/${id}`),
      API.get(`/reviews/event/${id}`),
      API.get(`/reviews/event/${id}/summary`),
      API.get(`/event-updates/event/${id}`),
    ])
      .then(([eventRes, reviewRes, summaryRes, updatesRes]) => {
        if (!isMounted) return;

        setEvent(eventRes.data);
        setLiveTickets(eventRes.data.available_tickets);
        setReviews(reviewRes.data);
        setReviewSummary(summaryRes.data);
        setEventUpdates(updatesRes.data);
      })
      .catch((err) => {
        console.error("Failed to load event details:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;

    API.post(`/recommendations/view/${id}`).catch((err) => {
      console.error("Failed to track event view:", err);
    });
  }, [id, user]);

  useEffect(() => {
    if (!id) return;

    const updatesInterval = window.setInterval(() => {
      fetchEventUpdates().catch((error) => {
        console.error("Failed to refresh event updates:", error);
      });
    }, 15000);

    return () => window.clearInterval(updatesInterval);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let ws = null;
    let pollingId = null;
    let isActive = true;

    const applyAvailabilityUpdate = (data) => {
      if (!isActive || Number(data.event_id) !== Number(id)) return;

      setLiveTickets(data.available_tickets);

      setEvent((prevEvent) =>
        prevEvent
          ? {
              ...prevEvent,
              available_tickets: data.available_tickets,
              status: data.status || prevEvent.status,
            }
          : prevEvent
      );
    };

    const startPolling = () => {
      if (pollingId) return;

      pollingId = window.setInterval(async () => {
        try {
          const res = await API.get(`/events/${id}`);
          applyAvailabilityUpdate({
            event_id: res.data.id,
            available_tickets: res.data.available_tickets,
            status: res.data.status,
          });
        } catch (error) {
          console.error("Failed to refresh ticket availability:", error);
        }
      }, 5000);
    };

    API.get(`/ws/events/${id}/availability`)
      .then(() => {
        if (!isActive) return;

        const wsBaseUrl =
          window.location.hostname === "localhost"
            ? "ws://127.0.0.1:8000"
            : "ws://127.0.0.1:8000";

        ws = new WebSocket(`${wsBaseUrl}/ws/events/${id}/availability`);

        ws.onmessage = (message) => {
          try {
            applyAvailabilityUpdate(JSON.parse(message.data));
          } catch (error) {
            console.error("Invalid WebSocket message:", error);
          }
        };

        ws.onerror = () => {
          startPolling();
        };
      })
      .catch(() => {
        startPolling();
      });

    return () => {
      isActive = false;
      if (ws) ws.close();
      if (pollingId) window.clearInterval(pollingId);
    };
  }, [id]);

  if (!event) return <h2>Loading event details...</h2>;

  const ticketSource =
    liveTickets !== null ? liveTickets : event.available_tickets;
  const parsedAvailableTickets = Number(ticketSource);
  const availableTickets = Number.isFinite(parsedAvailableTickets)
    ? parsedAvailableTickets
    : 0;

  const bookingAmount = Number(quantity || 0) * event.ticket_price;
  const payableAmount = couponResult?.final_amount ?? bookingAmount;
  const isExpired = isEventExpired(event);
  const isCancelled = isEventCancelled(event);
  const isSoldOut = availableTickets <= 0;
  const bannerImage = getSafeImageUrl(event.banner_image);

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

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code first.");
      setCouponResult(null);
      return;
    }

    if (isSoldOut) {
      setCouponMessage("Tickets are sold out.");
      setCouponResult(null);
      return;
    }

    try {
      const res = await API.post("/coupons/validate", {
        coupon_code: couponCode,
        booking_amount: bookingAmount,
      });

      setCouponResult(res.data);
      setCouponMessage(res.data.message);
    } catch (err) {
      setCouponResult(null);
      setCouponMessage(err.response?.data?.detail || "Invalid coupon");
    }
  };

  const handlePayment = async () => {
    setMessage("");

    const requestedQuantity = Number(quantity);

    if (isExpired || isCancelled) {
      setMessage("This event is no longer available for booking.");
      return;
    }

    if (isSoldOut) {
      setMessage("Tickets are sold out.");
      return;
    }

    if (!requestedQuantity || requestedQuantity <= 0) {
      setMessage("Please enter a valid ticket quantity.");
      return;
    }

    if (requestedQuantity > availableTickets) {
      setMessage(`Only ${availableTickets} ticket(s) available.`);
      return;
    }

    try {
      const res = await API.post(
        `/payments/create-checkout-session?event_id=${id}&quantity=${requestedQuantity}${
          couponResult
            ? `&coupon_code=${encodeURIComponent(couponResult.coupon_code)}`
            : ""
        }`
      );

      const checkoutUrl = new URL(res.data.checkout_url);
      navigate(`${checkoutUrl.pathname}${checkoutUrl.search}`);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Payment failed");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewMessage("");

    try {
      await API.post("/reviews/", {
        event_id: Number(id),
        rating: Number(rating),
        review_text: reviewText,
      });

      await fetchReviews();
      setReviewText("");
      setRating(5);
      setReviewMessage("Review submitted successfully.");
    } catch (err) {
      setReviewMessage(
        err.response?.data?.detail || "Unable to submit review."
      );
    }
  };

  const deleteReview = async (reviewId) => {
    await API.delete(`/reviews/${reviewId}`);
    await fetchReviews();
  };

  return (
    <div className="bms-detail-page">
      <h1 className="bms-detail-title">{event.title}</h1>

      <div className="bms-detail-layout">
        <div className="bms-poster-box">
          {bannerImage ? (
            <img src={bannerImage} alt={event.title} />
          ) : (
            <div className="event-image-fallback detail-fallback">
              <span>{event.category || event.title}</span>
            </div>
          )}
        </div>

        <aside className="bms-booking-card">
          <div className="bms-info-row">
            <span title="Date">📅</span>
            <p>{eventDate}</p>
          </div>

          <div className="bms-info-row">
            <span title="Time">🕒</span>
            <p>{eventTime}</p>
          </div>

          <div className="bms-info-row">
            <span title="Category">🏷️</span>
            <p>{event.category}</p>
          </div>

          <div className="bms-info-row">
            <span title="Location">📍</span>
            <p>{event.location}</p>
          </div>

          <div className="bms-info-row">
            <span title="Tickets">🎟️</span>
            <p>
              {availableTickets} ticket{availableTickets === 1 ? "" : "s"} available
            </p>
          </div>

          {isSoldOut && (
            <div className="error-text animate-msg">
              Tickets are sold out for this event.
            </div>
          )}

          <div className="bms-divider"></div>

          <div className="bms-price-row">
            <div>
              <h3>Rs.{event.ticket_price}</h3>
              <p>
                {isCancelled
                  ? "Event Cancelled"
                  : isExpired
                  ? "Expired"
                  : isSoldOut
                  ? "Sold Out"
                  : "Available"}
              </p>
            </div>

            <div className="bms-quantity">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                max={availableTickets}
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuantity(value);
                  setCouponResult(null);
                  setCouponMessage("");
                  setMessage("");
                }}
                disabled={isExpired || isCancelled || isSoldOut}
              />
            </div>
          </div>

          <div className="checkout-breakdown">
            <div>
              <span>Subtotal</span>
              <strong>Rs.{bookingAmount}</strong>
            </div>

            <div>
              <span>Discount</span>
              <strong>Rs.{couponResult?.discount_amount || 0}</strong>
            </div>

            <div className="summary-total">
              <span>Pay now</span>
              <strong>Rs.{payableAmount}</strong>
            </div>
          </div>

          <div className="coupon-row">
            <input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponResult(null);
                setCouponMessage("");
              }}
              disabled={isExpired || isCancelled || isSoldOut}
            />

            <button
              type="button"
              onClick={validateCoupon}
              disabled={isExpired || isCancelled || isSoldOut}
            >
              Apply
            </button>
          </div>

          {couponMessage && (
            <div
              className={`${
                couponResult ? "success-message" : "error-text"
              } animate-msg`}
            >
              {couponMessage}
            </div>
          )}

          {message && <div className="error-text animate-msg">{message}</div>}

          <button
            className="bms-book-btn"
            onClick={handlePayment}
            disabled={isExpired || isCancelled || isSoldOut}
          >
            {isCancelled
              ? "Event Cancelled"
              : isExpired
              ? "Expired"
              : isSoldOut
              ? "Sold Out"
              : "Book Now"}
          </button>
        </aside>
      </div>

      <section className="bms-about-section">
        <h2>About the event</h2>
        <p>{event.description}</p>
      </section>

      <section className="bms-about-section live-updates-section">
        <div className="live-updates-header">
          <div>
            <p className="eyebrow-text">Live Updates</p>
            <h2>Announcements</h2>
          </div>
          <span>{eventUpdates.length} update{eventUpdates.length === 1 ? "" : "s"}</span>
        </div>

        {eventUpdates.length === 0 ? (
          <p className="subtle-text">No live announcements have been posted yet.</p>
        ) : (
          <div className="live-updates-list">
            {eventUpdates.map((update) => (
              <article
                className={`live-update-item ${
                  update.is_important ? "important" : ""
                }`}
                key={update.id}
              >
                <div>
                  <strong>
                    {update.is_important ? "Important Announcement" : "Event Update"}
                  </strong>
                  <time>
                    {new Date(update.created_at).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p>{update.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="reviews-section">
        <div className="reviews-header">
          <div>
            <h2>Ratings and reviews</h2>
            <p className="subtle-text">
              {reviewSummary.average_rating || 0} / 5 from{" "}
              {reviewSummary.reviews_count || 0} reviews
            </p>
          </div>

          <div className="star-display">
            {"★".repeat(Math.round(reviewSummary.average_rating || 0))}
          </div>
        </div>

        <form className="review-form" onSubmit={submitReview}>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= rating ? "active-star" : ""}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience after attending this event..."
          />

          <button className="bms-book-btn" type="submit">
            Submit Review
          </button>

          {reviewMessage && (
            <div className="success-message">{reviewMessage}</div>
          )}
        </form>

        <div className="review-list">
          {reviews.map((review) => (
            <div className="review-item" key={review.id}>
              <div>
                <strong>{review.username || `User #${review.user_id}`}</strong>
                <span>{"★".repeat(review.rating)}</span>
              </div>

              <p>{review.review_text || "No written review."}</p>

              {user?.id === review.user_id && (
                <button
                  className="ghost-btn"
                  onClick={() => deleteReview(review.id)}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
