import type { Alert, SectorKey, Severity } from '../types/city'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

const SEARCH_QUERIES = [
  'алматы авария ДТП пожар',
  'алматы происшествие ЧС отключение',
]

const INCIDENT_KEYWORDS = [
  'дтп', 'авари', 'пожар', 'взрыв', 'отключени', 'загрязнени',
  'землетрясени', 'обрыв', 'чс', 'коллап', 'затоп', 'дым',
  'перекры', 'катастроф', 'погиб', 'пострадав', 'эвакуац',
]

async function fetchGoogleNews(query: string): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query)
    const res = await fetch(`/api/gnews?q=${encoded}&hl=ru&gl=KZ&ceid=KZ:ru`, {
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    return Array.from(doc.querySelectorAll('item'))
      .filter(item => {
        const pubDate = item.querySelector('pubDate')?.textContent ?? ''
        return pubDate ? new Date(pubDate).getTime() > thirtyDaysAgo : true
      })
      .slice(0, 20)
      .map(item => {
        const title = item.querySelector('title')?.textContent ?? ''
        const desc = item.querySelector('description')?.textContent ?? ''
        return `${title}. ${desc}`.replace(/<[^>]+>/g, '').slice(0, 300)
      })
      .filter(t => t.length > 20 && INCIDENT_KEYWORDS.some(kw => t.toLowerCase().includes(kw)))
  } catch {
    return []
  }
}

interface ParsedIncident {
  isRelevant: boolean
  sector: SectorKey
  severity: Severity
  title: string
  description: string
  locationName: string
  actionRequired: string
}

async function parseWithClaude(newsItems: string[]): Promise<ParsedIncident[]> {
  const numbered = newsItems.map((t, i) => `${i + 1}. ${t}`).join('\n')
  const prompt = `Новости об Алматы (${newsItems.length} штук):
${numbered}

Для каждой новости: это городской инцидент (ДТП, авария, пожар, загрязнение, отключение, ЧП, преступление)?
Верни JSON-массив ТОЛЬКО релевантных инцидентов (пропускай политику, спорт, культуру, экономику):
[{"sector":"transport|ecology|safety|utilities","severity":"critical|warning|normal","title":"до 55 символов","description":"1-2 предложения с деталями","locationName":"улица/район Алматы или неизвестно","actionRequired":"2-3 конкретных действия"}]

Цель — до 30 инцидентов. Только JSON-массив, без markdown.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'Классифицируй городские инциденты Алматы. Отвечай СТРОГО на русском языке. ТОЛЬКО JSON-массив без markdown, без пояснений.',
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return []
    return JSON.parse(match[0])
  } catch {
    return []
  }
}

async function geocodeLocation(name: string): Promise<{ lat: number; lng: number } | null> {
  if (!name || name === 'неизвестно') return null
  try {
    const q = encodeURIComponent(`${name}, Алматы, Казахстан`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=kz`,
      { headers: { 'User-Agent': 'SmartCityAlmaty/1.0' }, signal: AbortSignal.timeout(4000) }
    )
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

const FALLBACK_COORDS: Record<SectorKey, [number, number][]> = {
  transport: [[43.258, 76.943], [43.264, 76.951], [43.270, 76.940], [43.254, 76.920], [43.276, 76.961]],
  ecology:   [[43.290, 76.880], [43.320, 76.970], [43.210, 76.870], [43.295, 76.895]],
  safety:    [[43.245, 76.915], [43.268, 76.940], [43.288, 76.920], [43.222, 76.910]],
  utilities: [[43.260, 77.020], [43.235, 76.952], [43.220, 76.920], [43.247, 76.905]],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function fetchNewsIncidents(): Promise<Alert[]> {
  const rssResults = await Promise.allSettled(SEARCH_QUERIES.map(fetchGoogleNews))
  // Дедупликация по первым 60 символам заголовка
  const seen = new Set<string>()
  const allNews = rssResults
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .filter(t => { const key = t.slice(0, 60); if (seen.has(key)) return false; seen.add(key); return true })
    .slice(0, 35)

  if (allNews.length === 0) return []

  // Один вызов Claude на всю пачку — до 30 инцидентов
  const parsed = await parseWithClaude(allNews)
  if (parsed.length === 0) return []

  // Геокодируем параллельно
  const withCoords = await Promise.all(
    parsed.slice(0, 30).map(async p => {
      const coords = await geocodeLocation(p.locationName)
      const fallback = pickRandom(FALLBACK_COORDS[p.sector as SectorKey] ?? FALLBACK_COORDS.safety)
      return { p, lat: coords?.lat ?? fallback[0], lng: coords?.lng ?? fallback[1] }
    })
  )

  return withCoords.map(({ p, lat, lng }) => ({
    id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sector: p.sector as SectorKey,
    title: p.title,
    description: p.description,
    severity: p.severity as Severity,
    timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    location: p.locationName !== 'неизвестно' ? p.locationName : undefined,
    actionRequired: p.actionRequired,
    lat,
    lng,
    isGenerated: false,
    source: 'Google News → Claude',
  }))
}
