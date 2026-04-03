// OpenWeatherMap — Air Pollution forecast + прогноз погоды

const OWM_KEY = import.meta.env.VITE_OWM_KEY
const ALMATY_LAT = 43.2565
const ALMATY_LON = 76.9285

export interface OwmAirForecast {
  dt: number          // unix timestamp
  aqi: number         // 1-5 (1=good, 5=very bad)
  pm2_5: number
  pm10: number
  no2: number
  o3: number
  co: number
}

export interface OwmCurrentAir {
  aqi: number
  pm2_5: number
  pm10: number
  no2: number
  o3: number
  co: number
  fetchedAt: string
}

const AQI_LABELS = ['', 'Хорошее', 'Удовлетворительное', 'Умеренное', 'Плохое', 'Очень плохое']

export async function fetchOwmAirPollution(): Promise<OwmCurrentAir | null> {
  if (!OWM_KEY) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution` +
      `?lat=${ALMATY_LAT}&lon=${ALMATY_LON}&appid=${OWM_KEY}`
    )
    if (!res.ok) return null
    const data = await res.json()
    const c = data.list?.[0]
    if (!c) return null

    return {
      aqi: c.main.aqi,
      pm2_5: c.components.pm2_5,
      pm10: c.components.pm10,
      no2: c.components.no2,
      o3: c.components.o3,
      co: c.components.co,
      fetchedAt: new Date().toLocaleTimeString('ru-RU'),
    }
  } catch {
    return null
  }
}

export async function fetchOwmAirForecast(): Promise<OwmAirForecast[]> {
  if (!OWM_KEY) return []
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution/forecast` +
      `?lat=${ALMATY_LAT}&lon=${ALMATY_LON}&appid=${OWM_KEY}`
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.list ?? []).slice(0, 24).map((item: any) => ({
      dt: item.dt,
      aqi: item.main.aqi,
      pm2_5: item.components.pm2_5,
      pm10: item.components.pm10,
      no2: item.components.no2,
      o3: item.components.o3,
      co: item.components.co,
    }))
  } catch {
    return []
  }
}

export function aqiLabel(aqi: number): string {
  return AQI_LABELS[aqi] ?? '—'
}

export function aqiToSeverity(aqi: number): 'good' | 'warning' | 'critical' {
  if (aqi <= 2) return 'good'
  if (aqi <= 3) return 'warning'
  return 'critical'
}
