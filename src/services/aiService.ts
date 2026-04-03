import Anthropic from '@anthropic-ai/sdk'
import type { CityState, AIAnalysis } from '../types/city'
import { streamOllamaChat } from './ollamaService'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

function buildCityPrompt(state: CityState): string {
  const sectors = Object.values(state.sectors)
  const allAlerts = sectors.flatMap(s => s.alerts)
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical')
  const warningAlerts = allAlerts.filter(a => a.severity === 'warning')

  const kpiSummary = sectors.map(s => {
    const kpiLines = s.kpis.map(k => `  - ${k.label}: ${k.value} ${k.unit} (тренд: ${k.trend > 0 ? '+' : ''}${k.trend}%)`).join('\n')
    return `${s.label}:\n${kpiLines}`
  }).join('\n\n')

  const alertLines = allAlerts.map(a =>
    `[${a.severity.toUpperCase()}] ${a.sector}: ${a.title} — ${a.description}`
  ).join('\n')

  return `Ты — AI-аналитик системы управления умным городом ${state.city}.
Текущее время: ${state.timestamp}
Общий индекс здоровья города: ${state.overallScore}/100

ТЕКУЩИЕ KPI:
${kpiSummary}

АКТИВНЫЕ ИНЦИДЕНТЫ (${allAlerts.length} всего, ${criticalAlerts.length} критических, ${warningAlerts.length} предупреждений):
${alertLines}

Сформируй краткий управленческий отчёт строго в следующем JSON-формате (только JSON, без markdown):
{
  "whatHappening": "1-2 предложения: что сейчас происходит в городе",
  "howCritical": "1-2 предложения: оценка критичности ситуации и наиболее острые проблемы",
  "whatToDo": "3-4 конкретных действия для руководства прямо сейчас",
  "predictions": ["прогноз 1 на ближайшие 2 часа", "прогноз 2", "прогноз 3"],
  "summary": "2-3 предложения общего резюме для ЛПР"
}`
}

export async function analyzeCity(
  state: CityState,
  onUpdate?: (partial: Partial<AIAnalysis>) => void,
  provider: 'claude' | 'ollama' = 'claude',
  ollamaModel = 'llama3.2'
): Promise<AIAnalysis> {
  const result: AIAnalysis = {
    summary: '',
    whatHappening: '',
    howCritical: '',
    whatToDo: '',
    predictions: [],
    loading: true,
  }

  onUpdate?.({ loading: true })

  try {
    let fullText = ''

    if (provider === 'ollama') {
      // Ollama — локальный AI
      await streamOllamaChat(
        'Ты — AI-аналитик умного города. Отвечай строго в JSON формате без markdown.',
        [{ role: 'user', content: buildCityPrompt(state) }],
        ollamaModel,
        (partial) => {
          fullText = partial
          onUpdate?.({ loading: true, summary: partial.slice(0, 80) + '…' })
        }
      )
    } else {
      // Claude — облачный AI
      const stream = await client.messages.stream({
        model: 'claude-opus-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: buildCityPrompt(state) }],
      })

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
          onUpdate?.({ loading: true, summary: fullText.slice(0, 80) + '…' })
        }
      }
    }

    // Parse JSON response
    const jsonMatch = fullText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const final: AIAnalysis = {
        summary: parsed.summary || '',
        whatHappening: parsed.whatHappening || '',
        howCritical: parsed.howCritical || '',
        whatToDo: parsed.whatToDo || '',
        predictions: parsed.predictions || [],
        loading: false,
      }
      onUpdate?.(final)
      return final
    }

    throw new Error('Не удалось разобрать ответ AI')
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Ошибка AI-анализа'
    const fallback: AIAnalysis = {
      ...result,
      loading: false,
      error,
      summary: 'Демо-режим (API ключ не указан)',
      whatHappening:
        'В городе зафиксированы отклонения в 4 секторах: пиковая нагрузка электросети (94%), критическое AQI в Северном районе (168), затор на Ленинском проспекте и рост ночных инцидентов в Восточном районе.',
      howCritical:
        'Ситуация оценивается как умеренно-критическая. 3 инцидента требуют немедленного вмешательства: энергосистема, водопровод и рост преступности. Риск каскадного отключения электросети — высокий.',
      whatToDo:
        '1. Включить резервные подстанции и ограничить промышленное потребление. 2. Направить аварийную бригаду ЖКХ на ул. Гагарина. 3. Усилить патрулирование Восточного района. 4. Ограничить выбросы предприятий Северного района до нормализации AQI.',
      predictions: [
        'Загруженность электросети превысит 95% к 20:00 при текущей динамике',
        'AQI в Северном районе стабилизируется к полуночи при слабом ветре',
        'Пробки на Ленинском рассосутся к 21:30 после ликвидации ДТП',
      ],
    }
    onUpdate?.(fallback)
    return fallback
  }
}
