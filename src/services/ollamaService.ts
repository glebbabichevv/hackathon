// Ollama — локальный AI, работает без интернета и без ключей
// API: http://localhost:11434

const OLLAMA_BASE = 'http://localhost:11434'

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
}

export interface OllamaStatus {
  available: boolean
  models: OllamaModel[]
  running?: string
}

// Проверить доступность и список моделей
export async function checkOllama(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { available: false, models: [] }
    const data = await res.json()
    return { available: true, models: data.models ?? [] }
  } catch {
    return { available: false, models: [] }
  }
}

// Стриминговый чат с любой моделью Ollama
export async function streamOllamaChat(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  model: string,
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  })

  if (!res.ok) throw new Error(`Ollama: ${res.status} ${res.statusText}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.trim())
    for (const line of lines) {
      try {
        const data = JSON.parse(line)
        const chunk = data.message?.content ?? ''
        if (chunk) {
          full += chunk
          onChunk(full)
        }
        if (data.done) return full
      } catch {
        // пропустить невалидный chunk
      }
    }
  }
  return full
}

// Системный промпт с данными города (одинаков для Claude и Ollama)
import type { CityState } from '../types/city'

export function buildCitySystemPrompt(state: CityState): string {
  const sectors = Object.values(state.sectors)
  const allAlerts = sectors.flatMap(s => s.alerts)

  const kpiLines = sectors.map(s =>
    `${s.label}: ${s.kpis.map(k => `${k.label}=${k.value}${k.unit}(${k.severity})`).join(', ')}`
  ).join('\n')

  const alertLines = allAlerts.map(a =>
    `[${a.severity.toUpperCase()}] ${a.sector}: ${a.title}`
  ).join('\n')

  return `Ты — AI-советник системы управления умным городом ${state.city}, Казахстан.
Время: ${state.timestamp}. Индекс здоровья: ${state.overallScore}/100.

ПОКАЗАТЕЛИ:
${kpiLines}

ИНЦИДЕНТЫ (${allAlerts.length}):
${alertLines}

Отвечай кратко, конкретно, на русском. Используй данные выше. Markdown разрешён.`
}
