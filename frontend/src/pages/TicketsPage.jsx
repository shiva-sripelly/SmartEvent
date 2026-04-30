import { useEffect, useState } from "react";
import API from "../api/axios";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      const res = await API.get("/tickets/");
      setTickets(res.data);
    };

    fetchTickets();
  }, []);

  return (
    <div className="tickets-page">
      <div className="page-header-row">
        <div>
          <h2>My Tickets</h2>
          <p className="subtle-text">View confirmed ticket details and QR pass in a clean card layout.</p>
        </div>
      </div>

      <div className="tickets-grid">
        {tickets.map((t) => (
          <div className="card ticket-card" key={t.id}>
            <div className="ticket-card-header">
              <div>
                <h3>{t.event_title || "Event Ticket"}</h3>
                <p className="subtle-text">Booking ID: {t.booking_id}</p>
              </div>
              <span className={`status-pill ${t.booking_status?.toLowerCase() || "confirmed"}`}>
                {t.booking_status || "CONFIRMED"}
              </span>
            </div>

            <div className="ticket-card-body">
              <div className="ticket-details">
                <div className="ticket-field">
                  <span className="label">Location</span>
                  <span className="separator"> ; </span>
                  <strong>{t.event_location || "N/A"}</strong>
                </div>
                <div className="ticket-field">
                  <span className="label">Event Date</span>
                  <span className="separator"> ; </span>
                  <strong>{new Date(t.event_date).toLocaleString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</strong>
                </div>
                <div className="ticket-field">
                  <span className="label">Quantity</span>
                  <span className="separator"> ; </span>
                  <strong>{t.ticket_quantity}</strong>
                </div>
                <div className="ticket-field">
                  <span className="label">Total Paid</span>
                  <span className="separator"> ; </span>
                  <strong>₹{t.total_price}</strong>
                </div>
                <div className="ticket-field">
                  <span className="label">Ticket Code</span>
                  <span className="separator"> ; </span>
                  <strong>{t.ticket_code}</strong>
                </div>
              </div>

              <div className="qr-box">
                <img
                  src={`http://127.0.0.1:8000/${t.qr_code_url}`}
                  alt="QR Code"
                />
                <a
                  href={`http://127.0.0.1:8000/${t.qr_code_url}`}
                  download
                  className="download-btn"
                >
                  Download Ticket
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}