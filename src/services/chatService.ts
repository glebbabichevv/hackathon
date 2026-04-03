import Anthropic from '@anthropic-ai/sdk'
import type { CityState } from '../types/city'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

function buildSystemPrompt(state: CityState): string {
  const sectors = Object.values(state.sectors)
  const allAlerts = sectors.flatMap(s => s.alerts)
  const criticalAlerts = allAlerts.filter(a => a.severity === 'critical')

  const kpiLines = sectors.map(s =>
    `  ${s.label}:\n${s.kpis.map(k =>
      `    • ${k.label}: ${k.value} ${k.unit} (${k.trend > 0 ? '+' : ''}${k.trend}%, статус: ${k.severity})`
    ).join('\n')}`
  ).join('\n')

  const alertLines = allAlerts.map(a =>
    `  [${a.severity.toUpperCase()}] ${a.sector.toUpperCase()} — ${a.title}: ${a.description}${a.location ? ` Место: ${a.location}.` : ''} Действие: ${a.actionRequired}`
  ).join('\n')

  return `Ты — AI-советник системы управления умным городом ${state.city}, Казахстан.
Текущее время: ${state.timestamp}
Индекс здоровья города: ${state.overallScore}/100 (${state.overallSeverity})
Критических инцидентов: ${criticalAlerts.length}

ТЕКУЩИЕ KPI:
${kpiLines}

АКТИВНЫЕ ИНЦИДЕНТЫ (${allAlerts.length}):
${alertLines}

ПРАВИЛА:
- Отвечай кратко, структурировано, на русском языке
- Используй только реальные данные выше
- Для управленческих вопросов — давай конкретные приоритеты с цифрами
- Для отчётов — пиши официальным стилем с разделами
- Используй markdown для форматирования: **жирный**, списки, заголовки
- Всегда давай конкретные цифры из данных`
}

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  state: CityState,
  onChunk: (text: string) => void
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: buildSystemPrompt(state),
    messages,
  })

  let fullText = ''
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text
      onChunk(fullText)
    }
  }
  return fullText
}

export const QUICK_PROMPTS = [
  { label: '🔴 Что критично?', prompt: 'Перечисли только критические проблемы прямо сейчас с конкретными цифрами и действиями.' },
  { label: '📋 Приоритеты', prompt: 'Дай топ-3 приоритета для руководства на ближайший час с обоснованием.' },
  { label: '📊 Отчёт для руководства', prompt: 'Сформируй краткий управленческий отчёт о состоянии города для совещания. Включи: общую обстановку, критические точки, рекомендации.' },
  { label: '🚗 Транспорт', prompt: 'Подробный анализ транспортной ситуации: что происходит, причины, решения.' },
  { label: '🌿 Экология', prompt: 'Оцени экологическую обстановку. Есть ли угроза здоровью жителей? Что делать?' },
  { label: '⚡ Риски на 2 часа', prompt: 'Какие риски могут реализоваться в ближайшие 2 часа при текущей динамике? Дай прогноз по каждому сектору.' },
]
