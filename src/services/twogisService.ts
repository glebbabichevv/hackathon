// 2GIS Routing API — загруженность ключевых маршрутов Алматы
import type { Alert } from '../types/city'

const TWOGIS_KEY = import.meta.env.VITE_2GIS_KEY

// Ключевые маршруты Алматы: [название, от, до, midpoint]
const ROUTES = [
  { name: 'Аль-Фараби (запад–восток)', from: [43.2340, 76.8490], to: [43.2340, 77.0200], mid: [43.2340, 76.9345] },
  { name: 'Абая (запад–восток)',        from: [43.2580, 76.8700], to: [43.2580, 77.0000], mid: [43.2580, 76.9350] },
  { name: 'Саина (юг–север)',           from: [43.2050, 76.8950], to: [43.3100, 76.8950], mid: [43.2575, 76.8950] },
  { name: 'Рыскулова (запад–восток)',   from: [43.2380, 76.8600], to: [43.2380, 77.0300], mid: [43.2380, 76.9450] },
]

export interface RouteTraffic {
  name: string
  durationMin: number       // реальное время в пути (мин)
  durationFreeMin: number   // время без пробок (мин)
  congestionRatio: number   // > 1 = пробки (1.5 = на 50% дольше)
  distance: number          // км
  lat: number
  lng: number
}

export async function fetchAlmatyTraffic(): Promise<RouteTraffic[]> {
  if (!TWOGIS_KEY) return []

  const results: RouteTraffic[] = []

  await Promise.allSettled(ROUTES.map(async route => {
    try {
      const body = {
        points: [
          { type: 'driving', lat: route.from[0], lon: route.from[1] },
          { type: 'driving', lat: route.to[0], lon: route.to[1] },
        ],
        locale: 'ru',
        type: 'jam',
      }

      const res = await fetch(
        `https://routing.api.2gis.com/routing/7.0.0/global?key=${TWOGIS_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) return

      const data = await res.json()
      const r = data.result?.[0]
      if (!r) return

      const durationMin = Math.round((r.total_duration ?? 0) / 60)
      const durationFreeMin = Math.round((r.total_duration_without_jam ?? r.total_duration ?? 0) / 60)
      const distance = Math.round((r.total_distance ?? 0) / 100) / 10

      results.push({
        name: route.name,
        durationMin,
        durationFreeMin,
        congestionRatio: durationFreeMin > 0 ? durationMin / durationFreeMin : 1,
        distance,
        lat: route.mid[0],
        lng: route.mid[1],
      })
    } catch {
      // пропускаем маршрут при ошибке
    }
  }))

  return results
}

export function trafficToKpiValue(routes: RouteTraffic[]): number {
  if (routes.length === 0) return 50
  const avg = routes.reduce((sum, r) => sum + r.congestionRatio, 0) / routes.length
  return Math.min(100, Math.round((avg - 1) * 100))
}

export function trafficRoutesToAlerts(routes: RouteTraffic[]): Alert[] {
  return routes
    .filter(r => r.congestionRatio >= 1.3)
    .map(r => {
      const extra = Math.round((r.congestionRatio - 1) * 100)
      const severity = r.congestionRatio >= 1.8 ? 'critical' : r.congestionRatio >= 1.5 ? 'warning' : 'normal'
      return {
        id: `2gis_${r.name.replace(/\W/g, '_')}`,
        sector: 'transport' as const,
        title: `Пробка: ${r.name}`,
        description: `Время в пути ${r.durationMin} мин (без пробок ${r.durationFreeMin} мин). Задержка +${extra}%.`,
        severity,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        location: r.name,
        actionRequired: severity === 'critical'
          ? 'Рекомендовать объезд. Оповестить водителей через табло. Направить ДПС.'
          : 'Оповестить водителей через информационные табло.',
        lat: r.lat,
        lng: r.lng,
        isGenerated: false,
        source: '2GIS Real-time',
      } satisfies Alert
    })
}
