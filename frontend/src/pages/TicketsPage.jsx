import { useEffect, useState } from "react";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";
import { isEventExpired } from "../utils/eventStatus";

export default function TicketsPage() {
  const { language, t } = useLanguage();
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      const res = await API.get("/tickets/");
      setTickets([...res.data].sort((a, b) => b.booking_id - a.booking_id || b.id - a.id));
    };

    fetchTickets();
  }, []);

  return (
    <div className="tickets-page">
      <div className="page-header-row">
        <div>
          <h2>{t("myTickets")}</h2>
          <p className="subtle-text">
            {t("ticketsSubtitle")}
          </p>
        </div>
      </div>

      <div className="tickets-grid">
        {tickets.map((ticket) => {
          const isCancelled = ticket.event_status === "CANCELLED";
          const isExpired =
            !isCancelled &&
            (ticket.is_expired ||
              ticket.event_status === "COMPLETED" ||
              isEventExpired({ status: ticket.event_status, event_date: ticket.event_date }));

          const ticketStatus = isExpired
            ? "EXPIRED"
            : isCancelled
            ? "CANCELLED"
            : ticket.booking_status || "CONFIRMED";

          return (
            <div className="card ticket-card" key={ticket.id}>
              <div className="ticket-card-header">
                <div>
                  <h3>{ticket.event_title || t("eventTicket")}</h3>
                  <p className="subtle-text">{t("bookingId")}: {ticket.booking_id}</p>
                </div>

                <span className={`status-pill ${ticketStatus.toLowerCase()}`}>
                  {ticketStatus}
                </span>
              </div>

              <div className="ticket-card-body">
                <div className="ticket-details">
                  <div className="ticket-field">
                    <span className="label">{t("location")}</span>
                    <span className="separator"> ; </span>
                    <strong>{ticket.event_location || "N/A"}</strong>
                  </div>

                  <div className="ticket-field">
                    <span className="label">{t("eventDate")}</span>
                    <span className="separator"> ; </span>
                    <strong>
                      {new Date(ticket.event_date).toLocaleString(language === "hi" ? "hi-IN" : "en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>

                  <div className="ticket-field">
                    <span className="label">{t("quantity")}</span>
                    <span className="separator"> ; </span>
                    <strong>{ticket.ticket_quantity}</strong>
                  </div>

                  <div className="ticket-field">
                    <span className="label">{t("totalPaid")}</span>
                    <span className="separator"> ; </span>
                    <strong>₹{ticket.total_price}</strong>
                  </div>

                  <div className="ticket-field">
                    <span className="label">{t("ticketCode")}</span>
                    <span className="separator"> ; </span>
                    <strong>{ticket.ticket_code}</strong>
                  </div>
                </div>

                <div className="qr-box">
                  <img
                    src={`http://127.0.0.1:8000/${ticket.qr_code_url}`}
                    alt={t("qrCode")}
                  />

                  {isExpired || isCancelled ? (
                    <div className="expired-text" style={{ marginTop: 12 }}>
                      {isCancelled
                        ? t("ticketCancelledInvalid")
                        : t("ticketExpiredInvalid")}
                    </div>
                  ) : (
                    <a
                      href={`http://127.0.0.1:8000/${ticket.qr_code_url}`}
                      download
                      className="download-btn"
                    >
                      {t("downloadTicket")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




