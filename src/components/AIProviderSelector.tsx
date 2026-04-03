import { useState, useEffect } from 'react'
import { checkOllama, type OllamaModel } from '../services/ollamaService'

export type AIProvider = 'ollama'

interface Props {
  ollamaModel: string
  onModelChange: (m: string) => void
}

export function AIProviderSelector({ ollamaModel, onModelChange }: Props) {
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: OllamaModel[] }>({
    available: false, models: [],
  })
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    const status = await checkOllama()
    setOllamaStatus(status)
    if (status.available && status.models.length > 0 && !ollamaModel) {
      onModelChange(status.models[0].name)
    }
    setChecking(false)
  }

  useEffect(() => { check() }, [])

  const formatSize = (bytes: number) => {
    const gb = bytes / 1e9
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
  }

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🦙</span>
          <div>
            <p className="text-xs font-bold text-white">Ollama — локальный AI</p>
            <p className="text-[10px] text-slate-500">Работает без интернета и без API-ключей</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${ollamaStatus.available ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <button
            onClick={check}
            disabled={checking}
            className="text-[10px] text-slate-500 hover:text-slate-300 border border-[#1a3050] px-2 py-0.5 rounded transition-colors"
          >
            {checking ? '...' : '⟳'}
          </button>
        </div>
      </div>

      {ollamaStatus.available && ollamaStatus.models.length > 0 ? (
        <div>
          <p className="text-[10px] text-slate-500 mb-1.5">Активная модель:</p>
          <div className="flex flex-col gap-1">
            {ollamaStatus.models.map(m => (
              <button
                key={m.name}
                onClick={() => onModelChange(m.name)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                  ollamaModel === m.name
                    ? 'border-purple-400/60 bg-purple-400/10 text-purple-300'
                    : 'border-[#1a3050] text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-xs font-medium">{m.name}</span>
                <span className="text-[10px] text-slate-500">{formatSize(m.size)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-[10px] text-yellow-400 font-medium">Ollama не запущен</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            1. Скачай: <span className="text-slate-400">ollama.com</span><br />
            2. Запусти: <code className="text-yellow-300">ollama pull llama3.2</code><br />
            3. Сервер: <code className="text-yellow-300">ollama serve</code>
          </p>
        </div>
      )}
    </div>
  )
}
