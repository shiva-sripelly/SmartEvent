import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import useLanguage from "../context/useLanguage";
import { getSafeImageUrl } from "../utils/imageUrl";
import { isEventCancelled, isEventExpired } from "../utils/eventStatus";

export default function EventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();

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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

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

  if (!event) return <h2>{t("loadingEventDetails")}</h2>;

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

  const dateLocale = language === "hi" ? "hi-IN" : "en-IN";

  const eventDate = new Date(event.event_date).toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const eventTime = new Date(event.event_date).toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage(t("enterCouponFirst"));
      setCouponResult(null);
      return;
    }

    if (isSoldOut) {
      setCouponMessage(t("ticketsSoldOut"));
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
      setCouponMessage(err.response?.data?.detail || t("invalidCoupon"));
    }
  };

  const handlePayment = async () => {
    setMessage("");

    const requestedQuantity = Number(quantity);

    if (isExpired || isCancelled) {
      setMessage(t("unavailableForBooking"));
      return;
    }

    if (isSoldOut) {
      setMessage(t("ticketsSoldOut"));
      return;
    }

    if (!requestedQuantity || requestedQuantity <= 0) {
      setMessage(t("validTicketQuantity"));
      return;
    }

    if (requestedQuantity > availableTickets) {
      setMessage(t("onlyTicketsAvailable", { count: availableTickets }));
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
      setMessage(err.response?.data?.detail || t("paymentFailed"));
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
      setReviewMessage(t("reviewSubmitted"));
    } catch (err) {
      setReviewMessage(
        err.response?.data?.detail || t("reviewSubmitFailed")
      );
    }
  };

  const deleteReview = async (reviewId) => {
    await API.delete(`/reviews/${reviewId}`);
    await fetchReviews();
  };

  const getShareUrl = () => window.location.href;

  const getShareText = () =>
    t("shareEventText", { title: event.title, url: getShareUrl() });

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      getShareText()
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const copyEventLink = async () => {
    setShareMessage("");

    try {
      const shareUrl = getShareUrl();

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const linkField = document.createElement("textarea");
        linkField.value = shareUrl;
        linkField.setAttribute("readonly", "");
        linkField.style.position = "fixed";
        linkField.style.opacity = "0";
        document.body.appendChild(linkField);
        linkField.select();
        document.execCommand("copy");
        document.body.removeChild(linkField);
      }

      setShareMessage(t("eventLinkCopied"));
    } catch (error) {
      console.error("Unable to copy event link:", error);
      setShareMessage(t("copyFailed"));
    }
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
            <span title={t("date")}>📅</span>
            <p>{eventDate}</p>
          </div>

          <div className="bms-info-row">
            <span title={t("time")}>🕒</span>
            <p>{eventTime}</p>
          </div>

          <div className="bms-info-row">
            <span title={t("category")}>🏷️</span>
            <p>{event.category}</p>
          </div>

          <div className="bms-info-row">
            <span title={t("location")}>📍</span>
            <p>{event.location}</p>
          </div>

          <div className="bms-info-row">
            <span title={t("tickets")}>🎟️</span>
            <p>
              {availableTickets}{" "}
              {availableTickets === 1
                ? t("ticketAvailable")
                : t("ticketsAvailable")}
            </p>
          </div>

          {isSoldOut && (
            <div className="error-text animate-msg">
              {t("soldOutNotice")}
            </div>
          )}

          <div className="bms-divider"></div>

          <div className="event-share-panel">
            <button
              type="button"
              className="event-share-toggle"
              onClick={() => {
                setIsShareOpen((current) => !current);
                setShareMessage("");
              }}
              aria-expanded={isShareOpen}
            >
              {t("shareEvent")}
            </button>

            {isShareOpen && (
              <div className="event-share-popup">
                <div>
                  <p className="event-share-label">{t("inviteYourCircle")}</p>
                  <strong>{event.title}</strong>
                </div>

                <button type="button" onClick={shareOnWhatsApp}>
                  {t("whatsapp")}
                </button>

                <button type="button" onClick={copyEventLink}>
                  {t("copyLink")}
                </button>

                {shareMessage && (
                  <span className="event-share-message">{shareMessage}</span>
                )}
              </div>
            )}
          </div>

          <div className="bms-price-row">
            <div>
              <h3>Rs.{event.ticket_price}</h3>
              <p>
                {isCancelled
                  ? t("eventCancelled")
                  : isExpired
                  ? t("expired")
                  : isSoldOut
                  ? t("soldOut")
                  : t("available")}
              </p>
            </div>

            <div className="bms-quantity">
              <label>{t("quantity")}</label>
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
              <span>{t("subtotal")}</span>
              <strong>Rs.{bookingAmount}</strong>
            </div>

            <div>
              <span>{t("discount")}</span>
              <strong>Rs.{couponResult?.discount_amount || 0}</strong>
            </div>

            <div className="summary-total">
              <span>{t("payNow")}</span>
              <strong>Rs.{payableAmount}</strong>
            </div>
          </div>

          <div className="coupon-row">
            <input
              placeholder={t("couponPlaceholder")}
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
              {t("apply")}
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
              ? t("eventCancelled")
              : isExpired
              ? t("expired")
              : isSoldOut
              ? t("soldOut")
              : t("bookNow")}
          </button>
        </aside>
      </div>

      <section className="bms-about-section">
        <h2>{t("aboutEvent")}</h2>
        <p>{event.description}</p>
      </section>

      <section className="bms-about-section live-updates-section">
        <div className="live-updates-header">
          <div>
            <p className="eyebrow-text">{t("liveUpdates")}</p>
            <h2>{t("announcements")}</h2>
          </div>
          <span>
            {eventUpdates.length}{" "}
            {eventUpdates.length === 1 ? t("update") : t("updates")}
          </span>
        </div>

        {eventUpdates.length === 0 ? (
          <p className="subtle-text">{t("noAnnouncements")}</p>
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
                    {update.is_important
                      ? t("importantAnnouncement")
                      : t("eventUpdate")}
                  </strong>
                  <time>
                    {new Date(update.created_at).toLocaleString(dateLocale, {
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
            <h2>{t("ratingsAndReviews")}</h2>
            <p className="subtle-text">
              {t("reviewsFrom", {
                rating: reviewSummary.average_rating || 0,
                count: reviewSummary.reviews_count || 0,
              })}
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
            placeholder={t("reviewPlaceholder")}
          />

          <button className="bms-book-btn" type="submit">
            {t("submitReview")}
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

              <p>{review.review_text || t("noWrittenReview")}</p>

              {user?.id === review.user_id && (
                <button
                  className="ghost-btn"
                  onClick={() => deleteReview(review.id)}
                >
                  {t("delete")}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


