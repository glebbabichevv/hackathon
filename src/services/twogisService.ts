// 2GIS Routing API — загруженность ключевых маршрутов Алматы

const TWOGIS_KEY = import.meta.env.VITE_2GIS_KEY

// Ключевые маршруты Алматы: [название, от, до]
const ROUTES = [
  { name: 'Аль-Фараби (запад–восток)', from: [43.2340, 76.8490], to: [43.2340, 77.0200] },
  { name: 'Абая (запад–восток)', from: [43.2580, 76.8700], to: [43.2580, 77.0000] },
  { name: 'Саина (юг–север)', from: [43.2050, 76.8950], to: [43.3100, 76.8950] },
  { name: 'Рыскулова (запад–восток)', from: [43.2380, 76.8600], to: [43.2380, 77.0300] },
]

export interface RouteTraffic {
  name: string
  durationMin: number       // реальное время в пути (мин)
  durationFreeMin: number   // время без пробок (мин)
  congestionRatio: number   // > 1 = пробки (1.5 = на 50% дольше)
  distance: number          // км
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
  // congestionRatio 1.0 → 0% пробок, 2.0 → 100% пробок
  return Math.min(100, Math.round((avg - 1) * 100))
}
