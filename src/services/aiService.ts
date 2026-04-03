import Anthropic from '@anthropic-ai/sdk'
import { streamOllamaChat } from './ollamaService'
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
  provider = 'claude',
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
    if (provider === 'claude' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
      const stream = await anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'Ты — AI-аналитик умного города Алматы. Отвечай СТРОГО на русском языке. ТОЛЬКО валидный JSON без markdown, без ```.',
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

  } catch (ollamaErr) {
    // ── Ollama упала → пробуем Claude как fallback ─────────────────────────
    if (provider === 'ollama' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
      try {
        const stream = await anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: 'Ты — AI-аналитик умного города Алматы. Отвечай СТРОГО на русском языке. ТОЛЬКО валидный JSON без markdown, без ```.',
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
      } catch {
        // Claude тоже недоступен → rule-based анализ ниже
      }
    }

    // ── Оба AI недоступны → детерминированный анализ по данным ──────────────
    const sectors = Object.values(state.sectors)
    const allAlerts = sectors.flatMap(s => s.alerts)
    const critCount = allAlerts.filter(a => a.severity === 'critical').length
    const warnCount = allAlerts.filter(a => a.severity === 'warning').length
    const critSector = sectors.find(s => s.kpis.some(k => k.severity === 'critical'))
    const warnSectors = sectors.filter(s => s.kpis.some(k => k.severity === 'warning')).map(s => s.label)

    const ruleAnalysis: AIAnalysis = {
      ...fallback,
      summary: `Индекс здоровья города: ${state.overallScore}/100. Инцидентов: ${allAlerts.length} (критических: ${critCount}).`,
      whatHappening: critCount > 0
        ? `Зафиксировано ${critCount} критических и ${warnCount} предупреждающих инцидентов. Проблемные секторы: ${critSector?.label ?? ''} ${warnSectors.join(', ')}.`
        : warnCount > 0
          ? `Город в режиме повышенного внимания. ${warnCount} предупреждений в секторах: ${warnSectors.join(', ')}.`
          : `Все системы работают в штатном режиме. Индекс здоровья: ${state.overallScore}/100.`,
      howCritical: state.overallScore < 50
        ? `Критическая ситуация. Немедленное вмешательство требуется в ${critCount} секторах.`
        : state.overallScore < 70
          ? `Повышенная нагрузка на городские системы. Требуется мониторинг.`
          : `Ситуация контролируемая. Продолжать плановый мониторинг.`,
      whatToDo: critCount > 0
        ? `1. Активировать оперативный штаб по инцидентам в секторе "${critSector?.label}".\n2. Усилить патрулирование и мониторинг.\n3. Информировать население через официальные каналы.\n4. Подготовить резервные мощности.`
        : `1. Поддерживать текущий режим мониторинга.\n2. Контролировать KPI секторов каждые 30 минут.\n3. Провести плановые технические проверки.\n4. Обновить прогноз на следующие 4 часа.`,
      predictions: [
        state.overallScore < 60
          ? `Риск ухудшения обстановки в ближайшие 2 часа при сохранении текущих тенденций`
          : `Ситуация стабилизируется в течение 1-2 часов при отсутствии новых инцидентов`,
        `Мониторинг ${sectors.length} секторов: обновление данных каждые 2 минуты`,
        `Активных источников данных: USGS, WAQI, HERE Traffic, Open-Meteo, RSS`,
      ],
    }
    onUpdate?.(ruleAnalysis)
    return ruleAnalysis
  }
}
