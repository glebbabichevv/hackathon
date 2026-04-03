import { useState, useEffect } from 'react'
import { checkOllama, type OllamaModel } from '../services/ollamaService'

export type AIProvider = 'claude' | 'ollama'

interface Props {
  provider: AIProvider
  ollamaModel: string
  onProviderChange: (p: AIProvider) => void
  onModelChange: (m: string) => void
}

export function AIProviderSelector({ provider, ollamaModel, onProviderChange, onModelChange }: Props) {
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
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Провайдер</p>
        <button
          onClick={check}
          disabled={checking}
          className="text-[10px] text-slate-500 hover:text-slate-300 border border-[#1a3050] px-2 py-0.5 rounded transition-colors"
        >
          {checking ? '...' : '⟳ Проверить'}
        </button>
      </div>

      <div className="flex gap-2">
        {/* Claude */}
        <button
          onClick={() => onProviderChange('claude')}
          className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
            provider === 'claude'
              ? 'border-cyan-400/60 bg-cyan-400/10'
              : 'border-[#1a3050] hover:border-slate-600'
          }`}
        >
          <span className="text-lg">☁️</span>
          <div className="text-left">
            <p className={`text-xs font-bold ${provider === 'claude' ? 'text-cyan-300' : 'text-slate-400'}`}>
              Claude
            </p>
            <p className="text-[10px] text-slate-500">Anthropic API</p>
          </div>
          {provider === 'claude' && (
            <span className="ml-auto w-2 h-2 bg-cyan-400 rounded-full" />
          )}
        </button>

        {/* Ollama */}
        <button
          onClick={() => ollamaStatus.available && onProviderChange('ollama')}
          disabled={!ollamaStatus.available}
          className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
            provider === 'ollama'
              ? 'border-purple-400/60 bg-purple-400/10'
              : ollamaStatus.available
                ? 'border-[#1a3050] hover:border-slate-600'
                : 'border-[#1a3050] opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="text-lg">🦙</span>
          <div className="text-left">
            <p className={`text-xs font-bold ${provider === 'ollama' ? 'text-purple-300' : 'text-slate-400'}`}>
              Ollama
            </p>
            <p className="text-[10px] text-slate-500">
              {ollamaStatus.available
                ? `${ollamaStatus.models.length} моделей`
                : 'Не запущен'}
            </p>
          </div>
          <span className={`ml-auto w-2 h-2 rounded-full ${
            ollamaStatus.available ? 'bg-green-400 animate-pulse' : 'bg-slate-600'
          }`} />
        </button>
      </div>

      {/* Ollama model selector */}
      {provider === 'ollama' && ollamaStatus.available && ollamaStatus.models.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-slate-500 mb-1.5">Выбери модель:</p>
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
      )}

      {/* Ollama not running hint */}
      {!ollamaStatus.available && (
        <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <p className="text-[10px] text-yellow-400 font-medium">Ollama не запущен</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            1. Скачай: <span className="text-slate-400">ollama.com</span>
            <br />2. Запусти: <code className="text-yellow-300">ollama pull llama3.2</code>
          </p>
        </div>
      )}
    </div>
  )
}
