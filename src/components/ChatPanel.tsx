import { useState, useRef, useEffect, useCallback } from 'react'
import type { CityState } from '../types/city'
import { sendMessage, QUICK_PROMPTS, type ChatMessage } from '../services/chatService'

interface Props {
  state: CityState
  provider?: 'claude' | 'ollama'
  ollamaModel?: string
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
    .replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#00d4ff;margin:10px 0 4px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#00d4ff;margin:12px 0 6px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#00d4ff;margin:12px 0 6px">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00d4ff;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00d4ff;flex-shrink:0;font-weight:600">→</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div style="margin:6px 0"></div>')
    .replace(/\n/g, '<br/>')
}

export function ChatPanel({ state, provider = 'claude', ollamaModel = 'llama3.2' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Здравствуйте! Я AI-советник по управлению городом **${state.city}**.\n\nСейчас в городе **${Object.values(state.sectors).flatMap(s => s.alerts).filter(a => a.severity === 'critical').length} критических** и **${Object.values(state.sectors).flatMap(s => s.alerts).filter(a => a.severity === 'warning').length} предупреждающих** инцидентов. Индекс здоровья: **${state.overallScore}/100**.\n\nЗадайте любой вопрос или воспользуйтесь быстрыми командами ниже.`,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const msgCountRef   = useRef(messages.length)
  const nearBottomRef = useRef(false) // false on mount — don't auto-scroll until user sends

  // Track whether the user is near the bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      nearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Only scroll when a new message arrives or streaming while already at bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const newMessageAdded = messages.length > msgCountRef.current
    msgCountRef.current = messages.length

    if (newMessageAdded) {
      // New message sent/received — scroll and enable follow mode
      nearBottomRef.current = true
      el.scrollTop = el.scrollHeight
    } else if (nearBottomRef.current) {
      // Streaming token — only follow if user hasn't scrolled up
      el.scrollTop = el.scrollHeight
    }
    // No scroll on mount or tab switch
  }, [messages])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }

    const assistantId = `a_${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)
    setStreamingId(assistantId)

    try {
      const history = messages.filter(m => m.id !== 'welcome')
      await sendMessage(history, text.trim(), state, (partial) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: partial } : m)
        )
      }, provider, ollamaModel)
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: 'Ошибка подключения к AI. Проверьте API ключ.' }
          : m
        )
      )
    } finally {
      setIsStreaming(false)
      setStreamingId(null)
      inputRef.current?.focus()
    }
  }, [isStreaming, messages, state])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] overflow-hidden flex flex-col" style={{ height: 600 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1a3050] bg-gradient-to-r from-[#00d4ff08] to-transparent flex-shrink-0">
        <div className="relative">
          <span className="text-2xl">🤖</span>
          {isStreaming && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
          )}
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">AI-Советник города</h2>
          <p className="text-[11px] text-slate-500">
            {provider === 'ollama'
              ? <span className="text-purple-400">🦙 {ollamaModel} (локально)</span>
              : 'Claude Haiku (облако)'
            } · {Object.values(state.sectors).flatMap(s => s.alerts).length} инцидентов
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-cyan-400 animate-pulse' : 'bg-green-400'}`} />
          <span className="text-slate-500">{isStreaming ? 'Думает...' : 'Готов'}</span>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto border-b border-[#1a3050] flex-shrink-0">
        {QUICK_PROMPTS.map(qp => (
          <button
            key={qp.label}
            onClick={() => handleSend(qp.prompt)}
            disabled={isStreaming}
            className="flex-shrink-0 text-[11px] px-3 py-1 rounded-full border border-[#1a3050] text-slate-400 hover:border-cyan-400/50 hover:text-cyan-300 hover:bg-cyan-400/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[10px] font-black text-white mr-2 flex-shrink-0 mt-1">
                AI
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-400/15 border border-cyan-400/30 text-slate-200 rounded-tr-sm'
                  : 'bg-[#0f1f35] border border-[#1a3050] text-slate-300 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <>
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      style={{ lineHeight: 1.6 }}
                    />
                    {streamingId === msg.id && (
                      <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                    )}
                  </>
                ) : (
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-[#1a3050]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите что-нибудь о городе..."
            disabled={isStreaming}
            className="flex-1 bg-[#0f1f35] border border-[#1a3050] focus:border-cyan-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors duration-200 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isStreaming || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/40 hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-cyan-400 transition-all duration-200"
          >
            {isStreaming ? (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">Enter для отправки · Shift+Enter для переноса строки</p>
      </div>
    </div>
  )
}
