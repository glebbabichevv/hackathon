import type { Alert } from '../types/city'

const ALMATY_LAT = 43.257
const ALMATY_LNG = 76.940

export interface EarthquakeEvent {
  id: string
  magnitude: number
  place: string
  time: number
  lat: number
  lng: number
  depth: number
  distanceFromAlmaty: number
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  const res = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    { signal: AbortSignal.timeout(8000) }
  )
  const json = await res.json()
  return json.features
    .filter((f: any) => {
      const [lng, lat] = f.geometry.coordinates
      return lat >= 38 && lat <= 52 && lng >= 65 && lng <= 90
    })
    .map((f: any) => {
      const [lng, lat, depth] = f.geometry.coordinates
      return {
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        lat,
        lng,
        depth,
        distanceFromAlmaty: Math.round(haversineDistance(ALMATY_LAT, ALMATY_LNG, lat, lng)),
      }
    })
    .sort((a: EarthquakeEvent, b: EarthquakeEvent) => b.magnitude - a.magnitude)
}

export function earthquakeToAlert(eq: EarthquakeEvent): Alert {
  const severity = eq.magnitude >= 4.5 ? 'critical' : eq.magnitude >= 3.5 ? 'warning' : 'normal'
  return {
    id: `eq_${eq.id}`,
    sector: 'safety',
    title: `Землетрясение M${eq.magnitude.toFixed(1)} — ${eq.distanceFromAlmaty} км от Алматы`,
    description: `${eq.place}. Глубина: ${Math.round(eq.depth)} км. ${new Date(eq.time).toLocaleString('ru-RU')}`,
    severity,
    timestamp: new Date(eq.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    location: eq.place,
    actionRequired: severity === 'critical'
      ? 'Проверить здания на трещины. Оповестить службы ГО и ЧС. Усилить дежурство.'
      : 'Мониторинг афтершоков. Проверка критической инфраструктуры.',
    lat: eq.lat,
    lng: eq.lng,
    isGenerated: false,
    source: 'USGS Real-time',
  }
}
