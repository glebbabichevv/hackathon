import type { Alert } from '../types/city'

// Получить бесплатный токен: https://aqicn.org/data-platform/token/
const WAQI_TOKEN = import.meta.env.VITE_WAQI_TOKEN || 'demo'

export interface WaqiStation {
  name: string
  lat: number
  lng: number
  aqi: number
}

export async function fetchAlmatyAirStations(): Promise<WaqiStation[]> {
  try {
    const res = await fetch(
      `https://api.waqi.info/map/bounds/?latlng=43.0,76.5,43.6,77.4&token=${WAQI_TOKEN}`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    if (data.status !== 'ok') return []
    return (data.data as any[])
      .filter(s => s.aqi !== '-' && !isNaN(parseInt(s.aqi)))
      .map(s => ({
        name: s.station.name,
        lat: s.lat,
        lng: s.lon,
        aqi: parseInt(s.aqi),
      }))
  } catch {
    return []
  }
}

export function waqiStationToAlert(station: WaqiStation): Alert | null {
  if (station.aqi < 50) return null
  const severity = station.aqi >= 150 ? 'critical' : station.aqi >= 100 ? 'warning' : 'normal'
  return {
    id: `waqi_${station.name.replace(/\W/g, '_')}`,
    sector: 'ecology',
    title: `AQI ${station.aqi} — ${station.name}`,
    description: `Станция мониторинга воздуха. WAQI: ${station.aqi}. ${station.aqi >= 150 ? 'Опасный уровень загрязнения.' : 'Нездоровый уровень для чувствительных групп.'}`,
    severity,
    timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    location: station.name,
    actionRequired: severity === 'critical'
      ? 'Ограничить выбросы предприятий. Рекомендовать маски жителям. Закрыть окна.'
      : 'Усилить мониторинг. Ограничить промышленные выбросы.',
    lat: station.lat,
    lng: station.lng,
    isGenerated: false,
    source: 'WAQI Real Station',
  }
}
