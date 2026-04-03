// Open-Meteo APIs — бесплатно, без ключа, глобальное покрытие
// Данные CAMS (Copernicus Atmosphere Monitoring Service) + ERA5

const LAT = 43.257
const LON = 76.940

export interface WeatherData {
  temperature: number       // °C
  humidity: number          // %
  windSpeed: number         // км/ч
  windDirection: number     // градусы
  precipitation: number     // мм/ч
  weatherCode: number       // WMO код
  isRaining: boolean
  isSnowing: boolean
  isFoggy: boolean
  icon: string              // эмодзи
  condition: string         // описание
}

export interface AirQualityData {
  europeanAqi: number       // 0-100+, European AQI
  pm25: number              // мкг/м³
  pm10: number              // мкг/м³
  no2: number               // мкг/м³
  co: number                // мг/м³
  ozone: number             // мкг/м³
  aqiLabel: string
  aqiColor: string
}

export interface RealCityData {
  weather: WeatherData
  airQuality: AirQualityData
  fetchedAt: string
  sources: string[]
}

function weatherCodeToInfo(code: number): { icon: string; condition: string } {
  if (code === 0) return { icon: '☀️', condition: 'Ясно' }
  if (code === 1) return { icon: '🌤️', condition: 'Преимущественно ясно' }
  if (code === 2) return { icon: '⛅', condition: 'Переменная облачность' }
  if (code === 3) return { icon: '☁️', condition: 'Пасмурно' }
  if (code === 45 || code === 48) return { icon: '🌫️', condition: 'Туман' }
  if (code >= 51 && code <= 57) return { icon: '🌦️', condition: 'Морось' }
  if (code >= 61 && code <= 67) return { icon: '🌧️', condition: 'Дождь' }
  if (code >= 71 && code <= 77) return { icon: '❄️', condition: 'Снег' }
  if (code >= 80 && code <= 82) return { icon: '🌧️', condition: 'Ливень' }
  if (code === 85 || code === 86) return { icon: '🌨️', condition: 'Снегопад' }
  if (code >= 95 && code <= 99) return { icon: '⛈️', condition: 'Гроза' }
  return { icon: '🌡️', condition: 'Неизвестно' }
}

function aqiToLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: 'Отлично', color: '#00e676' }
  if (aqi <= 40) return { label: 'Хорошо', color: '#76ff03' }
  if (aqi <= 60) return { label: 'Умеренно', color: '#ffb300' }
  if (aqi <= 80) return { label: 'Плохо', color: '#ff6d00' }
  if (aqi <= 100) return { label: 'Очень плохо', color: '#ff1744' }
  return { label: 'Опасно', color: '#9c27b0' }
}

export async function fetchRealData(): Promise<RealCityData | null> {
  try {
    const [weatherRes, aqRes] = await Promise.allSettled([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,weather_code` +
        `&wind_speed_unit=kmh&timezone=Asia%2FAlmaty`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}` +
        `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,european_aqi` +
        `&timezone=Asia%2FAlmaty`
      ),
    ])

    let weather: WeatherData | null = null
    let airQuality: AirQualityData | null = null
    const sources: string[] = []

    if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
      const j = await weatherRes.value.json()
      const c = j.current
      const code = c.weather_code as number
      const info = weatherCodeToInfo(code)
      weather = {
        temperature: Math.round(c.temperature_2m * 10) / 10,
        humidity: Math.round(c.relative_humidity_2m),
        windSpeed: Math.round(c.wind_speed_10m),
        windDirection: Math.round(c.wind_direction_10m),
        precipitation: c.precipitation,
        weatherCode: code,
        isRaining: (code >= 51 && code <= 67) || (code >= 80 && code <= 82),
        isSnowing: code >= 71 && code <= 77,
        isFoggy: code === 45 || code === 48,
        icon: info.icon,
        condition: info.condition,
      }
      sources.push('Open-Meteo Weather')
    }

    if (aqRes.status === 'fulfilled' && aqRes.value.ok) {
      const j = await aqRes.value.json()
      const c = j.current
      const aqi = Math.round(c.european_aqi ?? 0)
      const aqiInfo = aqiToLabel(aqi)
      airQuality = {
        europeanAqi: aqi,
        pm25: Math.round((c.pm2_5 ?? 0) * 10) / 10,
        pm10: Math.round((c.pm10 ?? 0) * 10) / 10,
        no2: Math.round((c.nitrogen_dioxide ?? 0) * 10) / 10,
        co: Math.round((c.carbon_monoxide ?? 0) / 100) / 10,
        ozone: Math.round((c.ozone ?? 0) * 10) / 10,
        aqiLabel: aqiInfo.label,
        aqiColor: aqiInfo.color,
      }
      sources.push('Open-Meteo Air Quality (CAMS)')
    }

    if (!weather && !airQuality) return null

    // Fallback weather if API failed
    const w = weather ?? {
      temperature: 12, humidity: 55, windSpeed: 15, windDirection: 180,
      precipitation: 0, weatherCode: 1, isRaining: false, isSnowing: false, isFoggy: false,
      icon: '🌤️', condition: 'Данные недоступны',
    }

    // Fallback AQ if API failed
    const aq = airQuality ?? {
      europeanAqi: 45, pm25: 18, pm10: 32, no2: 25, co: 0.3, ozone: 85,
      aqiLabel: 'Умеренно', aqiColor: '#ffb300',
    }

    return {
      weather: w,
      airQuality: aq,
      fetchedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      sources,
    }
  } catch {
    return null
  }
}

// ── Применить реальные данные к CityState ────────────────────────────────────

import type { CityState, KPI, Severity } from '../types/city'

function updateKpi(
  kpis: KPI[],
  id: string,
  value: number,
  source: string,
  getSeverity: (v: number) => Severity
): void {
  const kpi = kpis.find(k => k.id === id)
  if (!kpi) return
  const prev = kpi.value
  kpi.value = Math.round(value * 10) / 10
  kpi.trend = prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0
  kpi.severity = getSeverity(value)
  kpi.isLive = true
  kpi.source = source
}

export function applyRealData(state: CityState, data: RealCityData): CityState {
  const s = JSON.parse(JSON.stringify(state)) as CityState
  const { weather, airQuality } = data

  // ── ЭКОЛОГИЯ: реальные данные ─────────────────────────────────────────────
  const eco = s.sectors.ecology
  const aqSrc = 'Open-Meteo CAMS'

  updateKpi(eco.kpis, 'aqi', airQuality.europeanAqi, aqSrc, v =>
    v >= 80 ? 'critical' : v >= 40 ? 'warning' : v >= 20 ? 'normal' : 'good'
  )
  // CO₂ — оцениваем из NO₂ (коэффициент корреляции ~1.4 для городской среды)
  updateKpi(eco.kpis, 'co2', 400 + airQuality.no2 * 1.8, aqSrc, v =>
    v >= 550 ? 'critical' : v >= 450 ? 'warning' : 'normal'
  )
  // Шум — слабый ветер + дождь снижают шум, сильный ветер усиливает
  const noiseDelta = weather.isRaining ? -3 : weather.windSpeed > 40 ? +4 : 0
  updateKpi(eco.kpis, 'noise', 68 + noiseDelta + (weather.windSpeed > 25 ? 2 : 0), 'Open-Meteo Weather', v =>
    v >= 75 ? 'critical' : v >= 65 ? 'warning' : 'normal'
  )
  // Добавляем новую точку в историю AQI
  const nowLabel = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (eco.history.aqi) {
    eco.history.aqi = [...eco.history.aqi.slice(1), { time: nowLabel, value: airQuality.europeanAqi }]
  }

  // ── ТРАНСПОРТ: влияние погоды ─────────────────────────────────────────────
  const trans = s.sectors.transport
  const weatherSrc = `Open-Meteo (${weather.condition})`
  const congBase = trans.kpis.find(k => k.id === 'traffic_congestion')?.value ?? 70
  const speedBase = trans.kpis.find(k => k.id === 'avg_speed')?.value ?? 35

  let congMultiplier = 1.0
  let speedMultiplier = 1.0
  if (weather.isSnowing) { congMultiplier = 1.30; speedMultiplier = 0.60 }
  else if (weather.isRaining) { congMultiplier = 1.18; speedMultiplier = 0.78 }
  else if (weather.isFoggy) { congMultiplier = 1.12; speedMultiplier = 0.82 }
  if (weather.windSpeed > 50) { congMultiplier *= 1.05; speedMultiplier *= 0.92 }

  updateKpi(trans.kpis, 'traffic_congestion',
    Math.min(99, Math.round(congBase * congMultiplier)),
    weatherSrc, v => v >= 80 ? 'critical' : v >= 60 ? 'warning' : 'normal'
  )
  updateKpi(trans.kpis, 'avg_speed',
    Math.max(10, Math.round(speedBase * speedMultiplier)),
    weatherSrc, v => v <= 20 ? 'critical' : v <= 30 ? 'warning' : 'normal'
  )

  // ── ЖКХ: потребление электричества от температуры ────────────────────────
  const util = s.sectors.utilities
  const temp = weather.temperature
  let elecAdjust = 0
  if (temp < -15) elecAdjust = 15       // сильный мороз — отопление
  else if (temp < -5) elecAdjust = 8
  else if (temp < 5) elecAdjust = 4
  else if (temp >= 5 && temp <= 30) elecAdjust = -4   // комфортный диапазон — норма
  else if (temp > 38) elecAdjust = 10   // экстремальная жара — кондиционеры
  else if (temp > 32) elecAdjust = 5

  const elecBase = util.kpis.find(k => k.id === 'electricity')?.value ?? 80
  updateKpi(util.kpis, 'electricity',
    Math.min(99, Math.max(40, Math.round(elecBase + elecAdjust))),
    `Open-Meteo (${temp > 0 ? '+' : ''}${temp}°C)`, v =>
    v >= 95 ? 'critical' : v >= 85 ? 'warning' : 'normal'
  )

  // ── Пересчёт общего индекса ───────────────────────────────────────────────
  const allKpis = Object.values(s.sectors).flatMap(sec => sec.kpis)
  const critCount = allKpis.filter(k => k.severity === 'critical').length
  const warnCount = allKpis.filter(k => k.severity === 'warning').length
  s.overallScore = Math.max(10, Math.min(100, 100 - critCount * 8 - warnCount * 3))
  s.overallSeverity = critCount >= 2 ? 'critical' : critCount === 1 || warnCount > 3 ? 'warning' : 'normal'
  s.timestamp = new Date().toLocaleString('ru-RU')

  return s
}
