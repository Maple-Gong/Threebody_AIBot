import { useState, useRef, useEffect, useCallback } from 'react'
import { sendReActMessage } from './reactApi'
import { getConversations, deleteConversation, renameConversation, getMessages } from './difyApi'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'

export default function App() {
  const [open, setOpen] = useState(true)
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadConv, setLoadConv] = useState(false)
  const [rename, setRename] = useState(null)
  const [rnVal, setRnVal] = useState('')
  const [err, setErr] = useState('')
  const endRef = useRef(null)
  const abortRef = useRef(null)
  const taskRef = useRef(null)
  const taRef = useRef(null)

  const loadConvs = useCallback(async () => {
    try { const d = await getConversations(50); setConvs(d.data || []) }
    catch (e) { setErr(e.message) }
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const selConv = async (cid) => {
    setActive(cid); setLoadConv(true); setErr('')
    try { const d = await getMessages(cid, 50); const m = []; for (const x of (d.data||[])) { m.push({role:'user',content:x.query}); m.push({role:'bot',content:x.answer}) } setMsgs(m) }
    catch (e) { setErr(e.message); setMsgs([]) } finally { setLoadConv(false) }
  }

  const newChat = () => { setActive(null); setMsgs([]); setInput(''); setErr(''); taRef.current?.focus() }

  const sendMsg = async (q) => {
    if (!q.trim() || loading) return
    setErr('')
    // bot消息包含steps数组（ReAct推理步骤）和content（最终答案）
    setMsgs(p => [...p, {role:'user',content:q}, {role:'bot',content:'',steps:[],streaming:true}])
    setInput(''); setLoading(true)
    const c = new AbortController(); abortRef.current = c
    try {
      const result = await sendReActMessage({
        query: q, conversationId: active || '', signal: c.signal,
        onStep: (step) => {
          setMsgs(p => { const u=[...p]; const l=u[u.length-1]; if(l&&l.role==='bot'){l.steps=[...l.steps, step]} return [...u] })
        },
        onAnswer: (text) => {
          setMsgs(p => { const u=[...p]; const l=u[u.length-1]; if(l&&l.role==='bot') l.content+=text; return [...u] })
        },
        onAnswerEnd: () => {
          setMsgs(p => { const u=[...p]; const l=u[u.length-1]; if(l&&l.role==='bot') l.streaming=false; return [...u] })
        },
        onError: (e) => {
          setErr(e.message)
          setMsgs(p => { const u=[...p]; const l=u[u.length-1]; if(l&&l.role==='bot'){l.streaming=false; if(!l.content)l.content='错误: '+e.message} return [...u] })
        },
      })
      // 回传会话ID：第一次发消息后Dify会返回新的conversationId，需要更新active状态
      if (result && result.conversationId && result.conversationId !== active) {
        setActive(result.conversationId)
      }
      await loadConvs()
    } catch (e) { if (e.name !== 'AbortError') setErr(e.message) }
    finally { setLoading(false); abortRef.current = null }
  }

  const handleStop = async () => {
    if (abortRef.current) abortRef.current.abort()
    setLoading(false)
    setMsgs(p => { const u = [...p]; const l = u[u.length-1]; if (l && l.role === 'bot') l.streaming = false; return [...u] })
  }

  const handleDelete = async (cid, e) => {
    e.stopPropagation(); if (!confirm('删除此会话？')) return
    try { await deleteConversation(cid); if (active === cid) newChat(); await loadConvs() }
    catch (e) { setErr(e.message) }
  }

  const handleRename = (conv, e) => { e.stopPropagation(); setRename(conv); setRnVal(conv.name) }
  const handleRenameOk = async () => {
    if (!rnVal.trim()) return
    try { await renameConversation(rename.id, rnVal.trim()); await loadConvs(); setRename(null) }
    catch (e) { setErr(e.message) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input) } }
  const ac = convs.find(c => c.id === active)

  return (
    <div className="app">
      <Sidebar sidebarOpen={open} conversations={convs} activeConvId={active}
        onSelect={selConv} onNew={newChat} onDelete={handleDelete} onRename={handleRename} />
      <div className="chat-area">
        <div className="chat-header">
          <button className="toggle-sidebar-btn" onClick={() => setOpen(!open)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="chat-title">{ac ? ac.name : '新对话'}</div>
        </div>
        {msgs.length === 0 && !loadConv ? <Welcome onSuggest={sendMsg} /> : <MessageList messages={msgs} loadingConv={loadConv} endRef={endRef} />}
        {err && <div style={{ padding: '8px 24px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>{err}</div>}
        <ChatInput input={input} setInput={setInput} onSend={() => sendMsg(input)} onKeyDown={handleKeyDown} loading={loading} onStop={handleStop} textareaRef={taRef} />
      </div>
      {rename && (
        <div className="modal-overlay" onClick={() => setRename(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">重命名会话</div>
            <input className="modal-input" value={rnVal} onChange={e => setRnVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameOk()} autoFocus />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setRename(null)}>取消</button>
              <button className="modal-btn confirm" onClick={handleRenameOk}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
