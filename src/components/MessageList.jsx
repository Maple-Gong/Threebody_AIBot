import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MessageList({ messages, loadingConv, endRef }) {
  return (
    <div className="messages-container">
      <div className="messages-inner">
        {loadingConv && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>加载中...</div>}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === 'user' ? '我' : 'AI'}</div>
            <div className="message-content">
              <div className="message-role">{msg.role === 'user' ? '用户' : '助手'}</div>
              <div className="message-bubble">
                {msg.streaming && !msg.content ? (
                  <div className="typing-indicator"><span></span><span></span><span></span></div>
                ) : msg.role === 'bot' ? (
                  <ReactMarkdown remarkGfm={remarkGfm}>{msg.content}</ReactMarkdown>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
