import type { CityState } from '../types/city'
import { streamOllamaChat, buildCitySystemPrompt } from './ollamaService'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export async function sendMessage(
  history: ChatMessage[],
  userMessage: string,
  state: CityState,
  onChunk: (text: string) => void,
  _provider = 'ollama',
  ollamaModel = 'llama3.2'
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  return streamOllamaChat(buildCitySystemPrompt(state), messages, ollamaModel, onChunk)
}

export const QUICK_PROMPTS = [
  { label: '🔴 Что критично?', prompt: 'Перечисли только критические проблемы прямо сейчас с конкретными цифрами и действиями.' },
  { label: '📋 Приоритеты', prompt: 'Дай топ-3 приоритета для руководства на ближайший час с обоснованием.' },
  { label: '📊 Отчёт для руководства', prompt: 'Сформируй краткий управленческий отчёт о состоянии города для совещания. Включи: общую обстановку, критические точки, рекомендации.' },
  { label: '🚗 Транспорт', prompt: 'Подробный анализ транспортной ситуации: что происходит, причины, решения.' },
  { label: '🌿 Экология', prompt: 'Оцени экологическую обстановку. Есть ли угроза здоровью жителей? Что делать?' },
  { label: '⚡ Риски на 2 часа', prompt: 'Какие риски могут реализоваться в ближайшие 2 часа при текущей динамике? Дай прогноз по каждому сектору.' },
]
