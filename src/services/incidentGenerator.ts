import Anthropic from '@anthropic-ai/sdk'
import type { CityState, Alert, SectorKey, Severity } from '../types/city'
import { streamOllamaChat } from './ollamaService'

const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

const ALMATY_LOCATIONS: Record<SectorKey, string[]> = {
  transport: [
    'проспект Абая, 42', 'ул. Тимирязева, 28', 'пересечение Назарбаева и Сейфуллина',
    'ул. Байзакова, 114', 'Аль-Фараби, 71', 'ул. Розыбакиева, 90',
    'пересечение Саина и Рыскулова', 'ул. Толе би, 65',
  ],
  ecology: [
    'Алатауский р-н, ул. Жетысу', 'Турксибский р-н, промзона', 'ул. Суюнбая, 480',
    'Бостандыкский р-н, ул. Левитана', 'п. Шанырак', 'ул. Момышулы, 18',
  ],
  safety: [
    'мкр. Орбита-2, ул. Навои', 'ул. Сейфуллина, 498', 'мкр. Аксай-4',
    'Алмалинский р-н, ул. Казыбек би', 'ул. Джандосова, 94', 'мкр. Тастак',
  ],
  utilities: [
    'ул. Райымбека, 212', 'мкр. Самал-2, ул. Достык', 'ул. Жандосова, 140',
    'мкр. Коктем-3', 'ул. Богенбай батыра, 155', 'мкр. Мамыр-4',
  ],
}

const ALMATY_COORDS: Record<SectorKey, [number, number][]> = {
  transport: [
    [43.2580, 76.9320], [43.2640, 76.9510], [43.2700, 76.9400],
    [43.2490, 76.9290], [43.2760, 76.9610], [43.2820, 76.9580],
    [43.2380, 76.8950], [43.2540, 76.9200],
  ],
  ecology: [
    [43.2900, 76.8800], [43.3200, 76.9700], [43.2750, 77.0300],
    [43.2200, 76.9700], [43.2100, 76.8700], [43.2950, 76.8950],
  ],
  safety: [
    [43.2450, 76.9150], [43.2680, 76.9400], [43.2300, 76.8800],
    [43.2700, 76.9270], [43.2200, 76.9100], [43.2880, 76.9200],
  ],
  utilities: [
    [43.2600, 77.0200], [43.2350, 76.9520], [43.2200, 76.9200],
    [43.2150, 76.8950], [43.2780, 76.9350], [43.2470, 76.9050],
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateIncident(state: CityState): Promise<Alert | null> {
  const existingTitles = Object.values(state.sectors)
    .flatMap(s => s.alerts)
    .map(a => a.title)
    .slice(0, 8)
    .join(' | ')

  const prompt = `Ты — система мониторинга умного города Алматы, Казахстан.
Текущее время: ${state.timestamp}. Индекс здоровья города: ${state.overallScore}/100.
Уже активные инциденты (не повторяй): ${existingTitles}

Сгенерируй ОДИН новый реалистичный городской инцидент. Будь конкретен и оригинален.

Верни ТОЛЬКО валидный JSON (без markdown, без \`\`\`):
{
  "sector": "transport",
  "title": "Краткое название (до 60 символов)",
  "description": "Конкретное описание ситуации, 1-2 предложения с цифрами.",
  "severity": "warning",
  "actionRequired": "2-3 конкретных действия через точку."
}

Допустимые значения sector: transport, ecology, safety, utilities
Допустимые значения severity: critical, warning, normal`

  try {
    let fullText = ''

    // Try Claude first, fall back to Ollama
    if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'Ты — система генерации городских инцидентов Алматы. Отвечай СТРОГО на русском языке. Возвращай ТОЛЬКО валидный JSON без markdown.',
        messages: [{ role: 'user', content: prompt }],
      })
      fullText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } else {
      await streamOllamaChat(
        'Ты — система генерации городских инцидентов Алматы. Отвечай СТРОГО на русском языке. JSON формат без markdown.',
        [{ role: 'user', content: prompt }],
        OLLAMA_MODEL,
        partial => { fullText = partial }
      )
    }

    const cleaned = fullText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    const sector = parsed.sector as SectorKey
    const coords = pickRandom(ALMATY_COORDS[sector] ?? ALMATY_COORDS.transport)
    const location = pickRandom(ALMATY_LOCATIONS[sector] ?? ALMATY_LOCATIONS.transport)

    return {
      id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sector,
      title: parsed.title ?? 'Новый инцидент',
      description: parsed.description ?? '',
      severity: (parsed.severity as Severity) ?? 'warning',
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      location,
      actionRequired: parsed.actionRequired ?? '',
      lat: coords[0],
      lng: coords[1],
      isGenerated: true,
    }
  } catch {
    return null
  }
}

export async function generateCrisis(state: CityState): Promise<Alert[]> {
  const results = await Promise.all([
    generateIncident(state),
    generateIncident(state),
    generateIncident(state),
  ])
  return results.filter(Boolean) as Alert[]
}
