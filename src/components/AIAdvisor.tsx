import { useState } from 'react'
import type { AIAnalysis } from '../types/city'

interface Props {
  analysis: AIAnalysis
  onRefresh: () => void
  provider?: 'claude' | 'ollama'
}

function speakText(text: string) {
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ru-RU'
  utt.rate = 0.92
  utt.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const ruVoice = voices.find(v => v.lang.startsWith('ru'))
  if (ruVoice) utt.voice = ruVoice
  window.speechSynthesis.speak(utt)
}

export function AIAdvisor({ analysis, onRefresh, provider = 'ollama' }: Props) {
  const [speaking, setSpeaking] = useState(false)

  const handleSpeak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    const text = [analysis.whatHappening, analysis.howCritical, analysis.whatToDo]
      .filter(Boolean).join('. ')
    if (!text) return
    setSpeaking(true)
    speakText(text)
    window.speechSynthesis.addEventListener('end', () => setSpeaking(false), { once: true })
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-[#07111e] overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40"
        style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.07) 0%, rgba(139,92,246,0.05) 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5e922, #8b5cf622)', border: '1px solid rgba(14,165,233,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="url(#aiGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <circle cx="9" cy="13" r="1" fill="#38bdf8" stroke="none"/>
                <circle cx="15" cy="13" r="1" fill="#38bdf8" stroke="none"/>
              </svg>
            </div>
            {analysis.loading && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-sky-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI-Аналитик</h2>
            <p className="text-[10px] text-slate-500">
              {provider === 'claude' ? 'Claude · Anthropic' : 'Ollama · Local'}
              {' · '}Real-time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.whatHappening && (
            <button
              onClick={handleSpeak}
              className={`text-xs border px-2.5 py-1.5 rounded-lg transition-all duration-200 ${speaking
                  ? 'border-orange-400/60 bg-orange-400/10 text-orange-400'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
            >
              {speaking ? '⏹' : '🔊'}
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={analysis.loading}
            className="flex items-center gap-1.5 text-xs text-sky-400 border border-sky-500/30 hover:border-sky-400/60 hover:bg-sky-400/8 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            <span className={`text-sm leading-none ${analysis.loading ? 'animate-spin inline-block' : ''}`}>⟳</span>
            {analysis.loading ? 'Анализ...' : 'Обновить'}
          </button>
        </div>
      </div>

      {analysis.loading && !analysis.whatHappening ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: 'linear-gradient(135deg, #38bdf8, #a78bfa)', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500">Анализирую городские данные...</p>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-4">
          {/* Summary */}
          {analysis.summary && (
            <div className="rounded-xl border border-sky-500/20 px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(139,92,246,0.04))' }}
            >
              <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Three blocks */}
          <div className="flex flex-col gap-2.5">
            <Block
              dot="bg-sky-400"
              title="Что происходит"
              borderColor="rgba(14,165,233,0.2)"
              bgColor="rgba(14,165,233,0.06)"
              text={analysis.whatHappening}
            />
            <Block
              dot="bg-orange-400"
              title="Насколько критично"
              borderColor="rgba(251,146,60,0.2)"
              bgColor="rgba(251,146,60,0.06)"
              text={analysis.howCritical}
            />
            <Block
              dot="bg-emerald-400"
              title="Что необходимо сделать"
              borderColor="rgba(52,211,153,0.2)"
              bgColor="rgba(52,211,153,0.06)"
              text={analysis.whatToDo}
            />
          </div>

          {/* Predictions */}
          {analysis.predictions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                Прогнозы · 2 часа
              </p>
              <div className="flex flex-col gap-1.5">
                {analysis.predictions.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[12px] text-slate-300 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2"
                  >
                    <span className="text-sky-500 font-bold flex-shrink-0 mt-0.5">›</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.error && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-3 py-2">
              <p className="text-xs text-yellow-400">
                <strong>Ошибка AI:</strong> {analysis.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Block({
  dot, title, borderColor, bgColor, text,
}: {
  dot: string; title: string; borderColor: string; bgColor: string; text: string
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 border"
      style={{ borderColor, background: bgColor }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      </div>
      <p className="text-[12.5px] text-slate-200 leading-relaxed">{text || '—'}</p>
    </div>
  )
}
