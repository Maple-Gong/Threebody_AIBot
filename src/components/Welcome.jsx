const SUGGESTIONS = [
  { title: '介绍三体问题', desc: '什么是三体问题？请简单介绍' },
  { title: '黑暗森林法则', desc: '解释一下黑暗森林法则' },
  { title: '面壁计划', desc: '面壁计划是什么？' },
  { title: '智子是什么', desc: '三体中的智子是什么？' },
]
export default function Welcome({ onSuggest }) {
  return (
    <div className="welcome-screen">
      <svg className="welcome-icon" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="20" fill="#155EEF"/>
        <circle cx="50" cy="50" r="18" fill="none" stroke="white" strokeWidth="3"/>
        <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="2" opacity="0.6"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
      </svg>
      <div className="welcome-title">三体问答</div>
      <div className="welcome-subtitle">基于 Dify AI 的问答助手</div>
      <div className="suggestions">
        {SUGGESTIONS.map(s => (
          <div key={s.title} className="suggestion-card" onClick={() => onSuggest(s.desc)}>
            <div className="suggestion-title">{s.title}</div>
            <div className="suggestion-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
