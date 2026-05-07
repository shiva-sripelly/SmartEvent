import { useEffect, useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function BookingHistoryPage() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const res = await API.get("/bookings/my-bookings");
      setBookings(
        [...res.data].sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0) ||
            b.id - a.id
        )
      );
    };

    fetchBookings();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header-row">
        <div>
          <h2>{t("myBookings")}</h2>
          <p className="subtle-text">{t("bookingsSubtitle")}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card empty-state">
          <h4>{t("noBookingsYet")}</h4>
          <p>{t("bookingsEmptyHelp")}</p>
        </div>
      ) : (
        bookings.map((b) => {
          const isCancelled = b.event_status === "CANCELLED";
          const isExpired =
            !isCancelled &&
            (b.event_status === "COMPLETED" ||
              (b.event_date && new Date(b.event_date) < new Date()));
          const bookingStatus = isCancelled
            ? "CANCELLED"
            : isExpired
            ? "EXPIRED"
            : b.booking_status;

          return (
          <div className="card booking-card" key={b.id}>
            <div className="booking-card-header">
              <div>
                <h4>{t("bookingNumber", { id: b.id })}</h4>
                <p className="category">{t("eventId")}: {b.event_id}</p>
              </div>
              <span className={`status-pill ${bookingStatus.toLowerCase()}`}>
                {bookingStatus}
              </span>
            </div>

            <div className="booking-row">
              <div>
                <p className="label">{t("tickets")}</p>
                <strong>{b.ticket_quantity}</strong>
              </div>
              <div>
                <p className="label">{t("subtotal")}</p>
                <strong>Rs.{b.total_price}</strong>
              </div>
              <div>
                <p className="label">{t("discount")}</p>
                <strong>Rs.{b.discount_amount || 0}</strong>
              </div>
              <div>
                <p className="label">{t("finalPaid")}</p>
                <strong>Rs.{b.final_amount ?? b.total_price}</strong>
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}




