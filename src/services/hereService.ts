import type { Alert, SectorKey } from '../types/city'

const HERE_KEY = import.meta.env.VITE_HERE_API_KEY
// Алматы центр, радиус 20 км
const ALMATY_LAT = 43.2565
const ALMATY_LON = 76.9285
const RADIUS = 20000

export interface HereIncident {
  id: string
  type: string
  severity: number // 0-4
  description: string
  lat: number
  lng: number
  streetName?: string
  startTime?: string
}

export async function fetchHereTrafficIncidents(): Promise<HereIncident[]> {
  if (!HERE_KEY) return []
  try {
    const url = `https://data.traffic.hereapi.com/v7/incidents` +
      `?apiKey=${HERE_KEY}` +
      `&in=circle:${ALMATY_LAT},${ALMATY_LON};r=${RADIUS}` +
      `&locationReferencing=shape`

    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()

    const results: HereIncident[] = (data.results ?? []).map((r: any) => {
      const loc = r.location?.shape?.links?.[0]
      const lat = loc?.points?.[0]?.lat ?? ALMATY_LAT
      const lng = loc?.points?.[0]?.lng ?? ALMATY_LON
      return {
        id: r.incidentDetails?.id ?? `here_${Math.random()}`,
        type: r.incidentDetails?.type ?? 'UNKNOWN',
        severity: r.incidentDetails?.criticality ?? 1,
        description: r.incidentDetails?.description?.value ?? 'Дорожный инцидент',
        lat,
        lng,
        streetName: r.location?.description?.value ?? '',
        startTime: r.incidentDetails?.startTime,
      }
    })
    return results
  } catch {
    return []
  }
}

const TYPE_MAP: Record<string, string> = {
  ACCIDENT: 'ДТП',
  CONGESTION: 'Затор',
  DISABLED_VEHICLE: 'Заглохший автомобиль',
  ROAD_CLOSURE: 'Перекрытие дороги',
  LANE_RESTRICTION: 'Ограничение полосы',
  CONSTRUCTION: 'Дорожные работы',
  WEATHER: 'Погодное ограничение',
}

const SEV_MAP: Record<number, 'critical' | 'warning' | 'normal'> = {
  4: 'critical',
  3: 'critical',
  2: 'warning',
  1: 'warning',
  0: 'normal',
}

export function hereIncidentToAlert(inc: HereIncident): Alert {
  const typeName = TYPE_MAP[inc.type] ?? inc.type
  const severity = SEV_MAP[inc.severity] ?? 'warning'

  return {
    id: `here_${inc.id}`,
    sector: 'transport' as SectorKey,
    title: `${typeName}${inc.streetName ? ` — ${inc.streetName}` : ''}`,
    description: inc.description,
    severity,
    timestamp: inc.startTime
      ? new Date(inc.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    location: inc.streetName ?? 'Алматы',
    actionRequired: severity === 'critical'
      ? 'Направить аварийные службы. Организовать объезд. Уведомить ДВД.'
      : 'Оповестить водителей через табло. Рекомендовать альтернативный маршрут.',
    lat: inc.lat,
    lng: inc.lng,
    source: 'HERE Traffic',
    isGenerated: false,
  }
}
