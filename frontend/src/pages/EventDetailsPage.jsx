import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average_rating: 0, reviews_count: 0 });
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const fetchReviews = async () => {
    const [reviewRes, summaryRes] = await Promise.all([
      API.get(`/reviews/event/${id}`),
      API.get(`/reviews/event/${id}/summary`),
    ]);
    setReviews(reviewRes.data);
    setReviewSummary(summaryRes.data);
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      API.get(`/events/${id}`),
      API.get(`/reviews/event/${id}`),
      API.get(`/reviews/event/${id}/summary`),
    ]).then(([eventRes, reviewRes, summaryRes]) => {
      if (!isMounted) return;
      setEvent(eventRes.data);
      setReviews(reviewRes.data);
      setReviewSummary(summaryRes.data);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!event) return <h2>Loading event details...</h2>;

  const bookingAmount = Number(quantity || 0) * event.ticket_price;
  const payableAmount = couponResult?.final_amount ?? bookingAmount;
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

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code first.");
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
    try {
      const res = await API.post(
        `/payments/create-checkout-session?event_id=${id}&quantity=${quantity}${
          couponResult ? `&coupon_code=${encodeURIComponent(couponResult.coupon_code)}` : ""
        }`
      );

      window.location.href = res.data.checkout_url;
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
      setReviewMessage(err.response?.data?.detail || "Unable to submit review.");
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
          <img src={event.banner_image} alt={event.title} />
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
            <p>{event.available_tickets} tickets available</p>
          </div>

          <div className="bms-divider"></div>

          <div className="bms-price-row">
            <div>
              <h3>Rs.{event.ticket_price}</h3>
              <p>{isExpired ? "Booking Closed" : "Available"}</p>
            </div>

            <div className="bms-quantity">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                max={event.available_tickets}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setCouponResult(null);
                  setCouponMessage("");
                }}
                disabled={isExpired || isCancelled}
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
              disabled={isExpired || isCancelled}
            />
            <button type="button" onClick={validateCoupon} disabled={isExpired || isCancelled}>
              Apply
            </button>
          </div>

          {couponMessage && (
            <div className={couponResult ? "success-message" : "error-text"}>
              {couponMessage}
            </div>
          )}

          <button
            className="bms-book-btn"
            onClick={handlePayment}
            disabled={isExpired || isCancelled}
          >
            {isCancelled ? "Event Cancelled" : isExpired ? "Booking Closed" : "Book Now"}
          </button>

          {couponMessage && (
  <div className={`${couponResult ? "success-message" : "error-text"} animate-msg`}>
    {couponMessage}
  </div>
)}
        </aside>
      </div>

      <section className="bms-about-section">
        <h2>About the event</h2>
        <p>{event.description}</p>
      </section>

      <section className="reviews-section">
        <div className="reviews-header">
          <div>
            <h2>Ratings and reviews</h2>
            <p className="subtle-text">
              {reviewSummary.average_rating || 0} / 5 from {reviewSummary.reviews_count || 0} reviews
            </p>
          </div>
          <div className="star-display">{"★".repeat(Math.round(reviewSummary.average_rating || 0))}</div>
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
          <button className="bms-book-btn" type="submit">Submit Review</button>
          {reviewMessage && <div className="success-message">{reviewMessage}</div>}
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
                <button className="ghost-btn" onClick={() => deleteReview(review.id)}>
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
