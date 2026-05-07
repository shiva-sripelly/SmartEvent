import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import useLanguage from "../context/useLanguage";

export default function ChatbotWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t("chatbotInitialMessage"),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latestPayload, setLatestPayload] = useState(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const sendMessage = async (messageText = input) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setLatestPayload(null);

    try {
      const res = await API.post("/chatbot/chat", {
        message: text,
        history: nextMessages.slice(-8),
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: res.data.reply },
      ]);
      setLatestPayload(res.data);
    } catch (err) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            err.response?.data?.detail ||
            t("chatbotUnavailable"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className={`chatbot-widget ${isOpen ? "open" : ""}`}>
      {isOpen && (
        <section className="chatbot-panel" aria-label={t("chatbotLabel")}>
          <div className="chatbot-header">
            <div>
              <strong>{t("chatbotAssistant")}</strong>
              <span>{t("chatbotSubtitle")}</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={t("navClose")}>
              X
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div className={`chatbot-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}

            {latestPayload?.events?.length > 0 && (
              <div className="chatbot-results">
                {latestPayload.events.map((event) => (
                  <Link to={`/events/${event.id}`} onClick={() => setIsOpen(false)} key={event.id}>
                    <strong>{event.title}</strong>
                    <span>{event.category} in {event.location}</span>
                  </Link>
                ))}
              </div>
            )}

            {latestPayload?.bookings?.length > 0 && (
              <div className="chatbot-results">
                {latestPayload.bookings.map((booking) => (
                  <button type="button" onClick={() => handleAction("/bookings")} key={booking.id}>
                    <strong>{booking.event_title}</strong>
                    <span>{booking.ticket_quantity} ticket(s) - {booking.booking_status}</span>
                  </button>
                ))}
              </div>
            )}

            {latestPayload?.action_path && (
              <button
                className="chatbot-action"
                type="button"
                onClick={() => handleAction(latestPayload.action_path)}
              >
                {t("openRelatedPage")}
              </button>
            )}

            {loading && <div className="chatbot-message assistant typing">{t("thinking")}</div>}
            <div ref={messagesEndRef}></div>
          </div>

          <div className="chatbot-suggestions">
            {(latestPayload?.suggestions?.length
              ? latestPayload.suggestions
              : [
                  t("chatbotTrending"),
                  t("chatbotBookings"),
                  t("chatbotMusic"),
                  t("chatbotTickets"),
                ]).map((suggestion) => (
              <button type="button" onClick={() => sendMessage(suggestion)} key={suggestion}>
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="chatbot-input"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("askEventsTickets")}
            />
            <button type="submit" disabled={loading}>
              {t("send")}
            </button>
          </form>
        </section>
      )}

      <button
        className="chatbot-toggle"
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={t("openAssistant")}
      >
        <span className="chatbot-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" focusable="false">
            <path
              d="M13.5 25.5v-3.1c0-6.2 4.7-10.9 10.5-10.9s10.5 4.7 10.5 10.9v3.1"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path
              d="M11.5 25.2c0-2.1 1.7-3.8 3.8-3.8h2.2v9.2h-2.2c-2.1 0-3.8-1.7-3.8-3.8v-1.6Z"
              fill="#ffffff"
            />
            <path
              d="M30.5 21.4h2.2c2.1 0 3.8 1.7 3.8 3.8v1.6c0 2.1-1.7 3.8-3.8 3.8h-2.2v-9.2Z"
              fill="#ffffff"
            />
            <path
              d="M33.8 31.1c-.8 3-3.2 5.4-7 5.4H24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="22" cy="36.5" r="2.2" fill="#ffffff" />
          </svg>
          🤖
        </span>
      </button>
    </div>
  );
}

