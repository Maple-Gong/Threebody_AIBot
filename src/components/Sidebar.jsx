export default function Sidebar({ sidebarOpen, conversations, activeConvId, onSelect, onNew, onDelete, onRename }) {
  return (
    <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <svg width="24" height="24" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="#155EEF"/>
            <circle cx="50" cy="50" r="18" fill="none" stroke="white" strokeWidth="3"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="2" opacity="0.6"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3"/>
          </svg>
          三体问答
        </div>
      </div>
      <button className="new-chat-btn" onClick={onNew}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新建对话
      </button>
      <div className="conversation-list">
        {conversations.map(conv => (
          <div key={conv.id} className={`conversation-item ${activeConvId === conv.id ? 'active' : ''}`} onClick={() => onSelect(conv.id)}>
            <span className="conversation-name">{conv.name || '新对话'}</span>
            <div className="conversation-actions">
              <button className="conv-action-btn" onClick={(e) => onRename(conv, e)} title="重命名">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button className="conv-action-btn danger" onClick={(e) => onDelete(conv.id, e)} title="删除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">基于 Dify API 构建</div>
    </div>
  )
}
