import type { Alert, SectorKey, Severity } from '../types/city'
import { streamOllamaChat } from './ollamaService'

const RSS_SOURCES = [
  'https://tengrinews.kz/rss/',
  'https://www.zakon.kz/rss.xml',
]
const CORS_PROXY = 'https://api.allorigins.win/get?url='

interface ParsedNewsIncident {
  isRelevant: boolean
  sector: SectorKey
  severity: Severity
  title: string
  description: string
  locationName: string
  actionRequired: string
}

async function fetchRss(url: string): Promise<string[]> {
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(url), {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    const xml = data.contents as string
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    return Array.from(doc.querySelectorAll('item'))
      .slice(0, 8)
      .map(item => {
        const title = item.querySelector('title')?.textContent ?? ''
        const desc = item.querySelector('description')?.textContent ?? ''
        return `${title}. ${desc}`.replace(/<[^>]+>/g, '').slice(0, 250)
      })
      .filter(t => t.length > 20)
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

async function parseWithOllama(newsText: string): Promise<ParsedNewsIncident | null> {
  const prompt = `Новость об Алматы: "${newsText}"

Это городской инцидент (ДТП, авария, пожар, загрязнение, отключение, преступление, землетрясение)?
Если НЕТ (политика, культура, спорт) → {"isRelevant": false}
Если ДА → верни JSON:
{"isRelevant":true,"sector":"transport|ecology|safety|utilities","severity":"critical|warning|normal","title":"название до 60 символов","description":"1-2 предложения","locationName":"улица Алматы или неизвестно","actionRequired":"2-3 действия"}

Только JSON:`

  let result = ''
  try {
    await streamOllamaChat(
      'Анализируй городские новости. Отвечай только JSON без markdown.',
      [{ role: 'user', content: prompt }],
      'llama3.2',
      t => { result = t }
    )
    const match = result.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

const FALLBACK_COORDS: Record<SectorKey, [number, number]> = {
  transport: [43.258, 76.943],
  ecology:   [43.290, 76.880],
  safety:    [43.268, 76.940],
  utilities: [43.250, 76.920],
}

export async function fetchNewsIncidents(): Promise<Alert[]> {
  const allNews: string[] = []
  for (const url of RSS_SOURCES) {
    allNews.push(...await fetchRss(url))
  }

  const alerts: Alert[] = []
  for (const text of allNews.slice(0, 12)) {
    const parsed = await parseWithOllama(text)
    if (!parsed?.isRelevant) continue

    const coords = await geocodeLocation(parsed.locationName)
    const [lat, lng] = coords
      ? [coords.lat, coords.lng]
      : FALLBACK_COORDS[parsed.sector]

    alerts.push({
      id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sector: parsed.sector,
      title: parsed.title,
      description: parsed.description,
      severity: parsed.severity,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      location: parsed.locationName !== 'неизвестно' ? parsed.locationName : undefined,
      actionRequired: parsed.actionRequired,
      lat,
      lng,
      isGenerated: false,
      source: 'Tengri/Zakon RSS → Ollama',
    })
  }
  return alerts
}
