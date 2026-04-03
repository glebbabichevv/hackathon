import { useState } from 'react'
import type { AIAnalysis } from '../types/city'

interface Props {
  analysis: AIAnalysis
  onRefresh: () => void
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

export function AIAdvisor({ analysis, onRefresh }: Props) {
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
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a3050] bg-gradient-to-r from-[#00d4ff10] to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-2xl">🤖</span>
            {analysis.loading && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI-Аналитик</h2>
            <p className="text-[11px] text-slate-500">Ollama · Локальный AI · Анализ в реальном времени</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysis.whatHappening && (
            <button
              onClick={handleSpeak}
              className={`text-xs border px-3 py-1.5 rounded-lg transition-all duration-200 ${
                speaking
                  ? 'border-orange-400/60 bg-orange-400/10 text-orange-400'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              {speaking ? '⏹ Стоп' : '🔊'}
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={analysis.loading}
            className="flex items-center gap-2 text-xs text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/60 hover:bg-cyan-400/10 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            <span className={analysis.loading ? 'animate-spin inline-block' : ''}>⟳</span>
            {analysis.loading ? 'Анализирую...' : 'Обновить'}
          </button>
        </div>
      </div>

      {analysis.loading && !analysis.whatHappening ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-slate-400">Анализирую городские данные...</p>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-5">
          {/* Summary */}
          {analysis.summary && (
            <div className="rounded-xl bg-gradient-to-r from-cyan-400/10 to-transparent border border-cyan-400/20 p-4">
              <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Three questions */}
          <div className="grid grid-cols-1 gap-3">
            <Block
              icon="📊"
              title="Что происходит"
              color="blue"
              text={analysis.whatHappening}
            />
            <Block
              icon="⚠️"
              title="Насколько критично"
              color="orange"
              text={analysis.howCritical}
            />
            <Block
              icon="✅"
              title="Что необходимо сделать"
              color="green"
              text={analysis.whatToDo}
            />
          </div>

          {/* Predictions */}
          {analysis.predictions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Прогнозы на ближайшие 2 часа
              </p>
              <div className="flex flex-col gap-2">
                {analysis.predictions.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-300 bg-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-cyan-400 font-bold flex-shrink-0">→</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.error && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
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

function Block({ icon, title, color, text }: { icon: string; title: string; color: string; text: string }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    green: 'border-green-500/30 bg-green-500/10 text-green-300',
  }

  return (
    <div className={`rounded-xl border ${colorMap[color]} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">{text || '—'}</p>
    </div>
  )
}
