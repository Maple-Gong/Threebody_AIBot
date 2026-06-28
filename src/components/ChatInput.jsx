export default function ChatInput({ input, setInput, onSend, onKeyDown, loading, onStop, textareaRef }) {
  return (
    <div className="chat-input-area">
      <div className="chat-input-inner">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="输入消息... (Enter发送, Shift+Enter换行)"
            rows="1"
            disabled={loading}
          />
          {loading ? (
            <button className="send-btn stop-btn" onClick={onStop} title="停止生成">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
          ) : (
            <button className="send-btn" onClick={onSend} disabled={!input.trim()} title="发送">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
