// OpenWeatherMap — Air Pollution forecast + текущая погода со станций

const OWM_KEY = import.meta.env.VITE_OWM_KEY
const ALMATY_LAT = 43.2565
const ALMATY_LON = 76.9285

export interface OwmCurrentWeather {
  temperature: number    // °C (реальная станция)
  feelsLike: number      // °C
  humidity: number       // %
  windSpeed: number      // км/ч
  windDirection: number  // градусы
  precipitation: number  // мм за 1 час
  owmCode: number        // код погоды OWM
  description: string
  isRaining: boolean
  isSnowing: boolean
  isFoggy: boolean
  icon: string           // эмодзи
  condition: string      // на русском
  stationName?: string
}

function owmCodeToInfo(code: number): { icon: string; condition: string } {
  if (code >= 200 && code < 300) return { icon: '⛈️', condition: 'Гроза' }
  if (code >= 300 && code < 400) return { icon: '🌦️', condition: 'Морось' }
  if (code >= 500 && code < 600) {
    if (code === 500) return { icon: '🌧️', condition: 'Лёгкий дождь' }
    if (code === 501) return { icon: '🌧️', condition: 'Дождь' }
    return { icon: '🌧️', condition: 'Сильный дождь' }
  }
  if (code >= 600 && code < 700) return { icon: '❄️', condition: 'Снег' }
  if (code === 701 || code === 741) return { icon: '🌫️', condition: 'Туман' }
  if (code >= 700 && code < 800) return { icon: '🌫️', condition: 'Дымка' }
  if (code === 800) return { icon: '☀️', condition: 'Ясно' }
  if (code === 801) return { icon: '🌤️', condition: 'Малооблачно' }
  if (code === 802) return { icon: '⛅', condition: 'Переменная облачность' }
  if (code >= 803) return { icon: '☁️', condition: 'Пасмурно' }
  return { icon: '🌡️', condition: 'Неизвестно' }
}

export async function fetchOwmCurrentWeather(): Promise<OwmCurrentWeather | null> {
  if (!OWM_KEY) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${ALMATY_LAT}&lon=${ALMATY_LON}&appid=${OWM_KEY}&units=metric&lang=ru`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    const code = d.weather?.[0]?.id ?? 800
    const info = owmCodeToInfo(code)
    return {
      temperature: Math.round(d.main.temp * 10) / 10,
      feelsLike: Math.round(d.main.feels_like * 10) / 10,
      humidity: Math.round(d.main.humidity),
      windSpeed: Math.round((d.wind?.speed ?? 0) * 3.6),
      windDirection: Math.round(d.wind?.deg ?? 0),
      precipitation: d.rain?.['1h'] ?? d.snow?.['1h'] ?? 0,
      owmCode: code,
      description: d.weather?.[0]?.description ?? '',
      isRaining: code >= 300 && code < 600,
      isSnowing: code >= 600 && code < 700,
      isFoggy: code === 701 || code === 741 || code === 721,
      icon: info.icon,
      condition: info.condition,
      stationName: d.name,
    }
  } catch {
    return null
  }
}

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
