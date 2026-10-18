import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api } from "../../services/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function FitnessChat() {
  // Panel open/close — conversation is preserved in state while the page is open
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    setIsOpen(true);
    // Focus input after animation frame
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function closePanel() {
    setIsOpen(false);
  }

  async function submit() {
    const question = input.trim();
    if (!question || thinking) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setError("");
    setThinking(true);

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const { answer } = await api.askChat(question);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not reach the fitness assistant.",
      );
    } finally {
      setThinking(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 50);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const isEmpty = messages.length === 0 && !thinking;
  const unread = !isOpen && messages.length > 0;

  return (
    <>
      {/* ── Floating panel ── */}
      {isOpen && (
        <div className="fchat-panel" role="dialog" aria-label="Fitness Assistant">
          {/* Header */}
          <div className="fchat-header">
            <div className="fchat-header-left">
              <span className="fchat-header-icon">💬</span>
              <div>
                <p className="fchat-header-title">Fitness Assistant</p>
                <p className="fchat-header-sub">General tips · not medical advice</p>
              </div>
            </div>
            <button
              className="fchat-close"
              onClick={closePanel}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="fchat-messages">
            {isEmpty && (
              <p className="fchat-prompt">What's on your mind today?</p>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble ${
                  msg.role === "user"
                    ? "chat-bubble--user"
                    : "chat-bubble--assistant"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {thinking && (
              <div className="chat-bubble chat-bubble--assistant chat-thinking">
                <span className="chat-thinking-dot" />
                <span className="chat-thinking-dot" />
                <span className="chat-thinking-dot" />
                <span className="chat-thinking-label">Thinking…</span>
              </div>
            )}

            {error && (
              <div
                className="error-banner"
                role="alert"
                style={{ margin: "8px 0 0", fontSize: "12px" }}
              >
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about workouts, nutrition, recovery…"
              disabled={thinking}
              aria-label="Fitness question"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={thinking || !input.trim()}
              aria-label="Send"
            >
              {thinking ? (
                <span className="chat-send-spinner" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        className="fchat-trigger"
        onClick={isOpen ? closePanel : openPanel}
        aria-label={isOpen ? "Close fitness assistant" : "Open fitness assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {unread && <span className="fchat-unread-dot" aria-hidden="true" />}
      </button>
    </>
  );
}
