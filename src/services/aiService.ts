import { streamOllamaChat, buildCitySystemPrompt } from './ollamaService'
import type { CityState, AIAnalysis } from '../types/city'

const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'

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

  try {
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

    // Убираем markdown-обёртку если модель добавила ```json ... ```
    const cleaned = fullText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const result: AIAnalysis = {
          summary: parsed.summary || '',
          whatHappening: parsed.whatHappening || '',
          howCritical: parsed.howCritical || '',
          whatToDo: parsed.whatToDo || '',
          predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
          loading: false,
        }
        onUpdate?.(result)
        return result
      } catch {
        throw new Error('Модель вернула невалидный JSON')
      }
    }
    throw new Error('JSON не найден в ответе модели')
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Ошибка Ollama'
    const isNotRunning = error.includes('fetch') || error.includes('Failed')

    const result: AIAnalysis = {
      ...fallback,
      error: isNotRunning ? 'Ollama не запущена. Запустите: ollama serve' : error,
      summary: 'Ollama не доступна',
      whatHappening: `Запустите Ollama: ollama serve && ollama pull ${ollamaModel}`,
      howCritical: 'AI-анализ недоступен без локальной модели.',
      whatToDo: `1. Установите Ollama: ollama.com\n2. Скачайте модель: ollama pull ${ollamaModel}\n3. Запустите сервер: ollama serve`,
      predictions: [],
    }
    onUpdate?.(result)
    return result
  }
}
