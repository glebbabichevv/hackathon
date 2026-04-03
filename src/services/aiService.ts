import Anthropic from '@anthropic-ai/sdk'
import { streamOllamaChat, buildCitySystemPrompt } from './ollamaService'
import type { CityState, AIAnalysis } from '../types/city'

const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

function buildAnalysisPrompt(state: CityState): string {
  const sectors = Object.values(state.sectors)
  const allAlerts = sectors.flatMap(s => s.alerts)
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical')
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning')

  const kpiSummary = sectors.map(s => {
    const kpiLines = s.kpis.map(k =>
      `  - ${k.label}: ${k.value} ${k.unit} (тренд: ${k.trend > 0 ? '+' : ''}${k.trend}%)`
    ).join('\n')
    return `${s.label}:\n${kpiLines}`
  }).join('\n\n')

  const alertLines = allAlerts.map(a =>
    `[${a.severity.toUpperCase()}] ${a.sector}: ${a.title} — ${a.description}`
  ).join('\n')

  return `Ты — AI-аналитик системы управления умным городом ${state.city}.
Время: ${state.timestamp}. Индекс здоровья: ${state.overallScore}/100.
Инцидентов: ${allAlerts.length} (критических: ${criticalAlerts.length}, предупреждений: ${warningAlerts.length})

ТЕКУЩИЕ KPI:
${kpiSummary}

АКТИВНЫЕ ИНЦИДЕНТЫ:
${alertLines}

Ответь ТОЛЬКО валидным JSON (без markdown, без \`\`\`):
{
  "whatHappening": "1-2 предложения что происходит в городе",
  "howCritical": "1-2 предложения оценка критичности и острые проблемы",
  "whatToDo": "3-4 конкретных действия для руководства",
  "predictions": ["прогноз 1 на 2 часа", "прогноз 2", "прогноз 3"],
  "summary": "2-3 предложения общего резюме"
}`
}

export async function analyzeCity(
  state: CityState,
  onUpdate?: (partial: Partial<AIAnalysis>) => void,
  _provider = 'ollama',
  ollamaModel = OLLAMA_MODEL
): Promise<AIAnalysis> {
  onUpdate?.({ loading: true })

  const fallback: AIAnalysis = {
    summary: '',
    whatHappening: '',
    howCritical: '',
    whatToDo: '',
    predictions: [],
    loading: false,
    error: undefined,
  }

  const parseJSON = (text: string): AIAnalysis | null => {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      const p = JSON.parse(match[0])
      return {
        summary: p.summary || '',
        whatHappening: p.whatHappening || '',
        howCritical: p.howCritical || '',
        whatToDo: p.whatToDo || '',
        predictions: Array.isArray(p.predictions) ? p.predictions : [],
        loading: false,
      }
    } catch { return null }
  }

  try {
    // ── Claude (облачный) ──────────────────────────────────────────────────────
    if (_provider === 'claude' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
      const stream = await anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: buildCitySystemPrompt(state),
        messages: [{ role: 'user', content: buildAnalysisPrompt(state) }],
      })
      let fullText = ''
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          onUpdate?.({ loading: true, summary: fullText.slice(0, 80) + '…' })
        }
      }
      const result = parseJSON(fullText)
      if (result) { onUpdate?.(result); return result }
      throw new Error('JSON не найден в ответе Claude')
    }

    // ── Ollama (локальный) ─────────────────────────────────────────────────────
    let fullText = ''
    await streamOllamaChat(
      'Ты — AI-аналитик умного города. Отвечай строго в JSON формате без markdown.',
      [{ role: 'user', content: buildAnalysisPrompt(state) }],
      ollamaModel,
      partial => {
        fullText = partial
        onUpdate?.({ loading: true, summary: partial.slice(0, 80) + '…' })
      }
    )
    const result = parseJSON(fullText)
    if (result) { onUpdate?.(result); return result }
    throw new Error('JSON не найден в ответе модели')

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Ошибка AI'
    const isNotRunning = error.includes('fetch') || error.includes('Failed')

    const result: AIAnalysis = {
      ...fallback,
      error: isNotRunning ? 'Ollama не запущена. Запустите: ollama serve' : error,
      summary: 'AI недоступен',
      whatHappening: `Запустите Ollama: ollama serve && ollama pull ${ollamaModel}`,
      howCritical: 'AI-анализ недоступен.',
      whatToDo: `1. Установите Ollama: ollama.com\n2. Скачайте модель: ollama pull ${ollamaModel}\n3. Запустите сервер: ollama serve`,
      predictions: [],
    }
    onUpdate?.(result)
    return result
  }
}
