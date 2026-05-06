import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

const quickSuggestions = [
  "Trending events",
  "My bookings",
  "Suggest music events this weekend",
  "Help with ticket issues",
];

const initialMessages = [
  {
    role: "assistant",
    content: "Hi, I am your SmartEvent assistant. Ask me to find events, show bookings, or help with tickets.",
  },
];

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
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
            "I could not reach the assistant right now. Please try again.",
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
        <section className="chatbot-panel" aria-label="SmartEvent chatbot">
          <div className="chatbot-header">
            <div>
              <strong>SmartEvent Assistant</strong>
              <span>Event discovery and support</span>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">
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
                Open related page
              </button>
            )}

            {loading && <div className="chatbot-message assistant typing">Thinking...</div>}
            <div ref={messagesEndRef}></div>
          </div>

          <div className="chatbot-suggestions">
            {(latestPayload?.suggestions?.length ? latestPayload.suggestions : quickSuggestions).map((suggestion) => (
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
              placeholder="Ask about events or tickets..."
            />
            <button type="submit" disabled={loading}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        className="chatbot-toggle"
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label="Open SmartEvent assistant"
      >
        <span className="chatbot-toggle-icon" aria-hidden="true">
          🤖
        </span>
      </button>
    </div>
  );
}
