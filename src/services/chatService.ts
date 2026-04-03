import Anthropic from '@anthropic-ai/sdk'
import type { CityState } from '../types/city'
import { streamOllamaChat, buildCitySystemPrompt } from './ollamaService'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

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
  provider: 'claude' | 'ollama' = 'claude',
  ollamaModel = 'llama3.2'
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  // ── Claude ─────────────────────────────────────────────────────────────────
  if (provider === 'claude' && import.meta.env.VITE_ANTHROPIC_API_KEY) {
    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: buildCitySystemPrompt(state),
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

  // ── Ollama ─────────────────────────────────────────────────────────────────
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
