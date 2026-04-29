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
    <div>
      <h2>My Tickets</h2>

      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <h4>Ticket Code: {t.ticket_code}</h4>

          <img
            src={`http://127.0.0.1:8000/${t.qr_code_url}`}
            alt="QR"
            width="200"
          />

          <br />

          <a
            href={`http://127.0.0.1:8000/${t.qr_code_url}`}
            download
            className="download-btn"
          >
            Download Ticket
          </a>
        </div>
      ))}
    </div>
  );
}