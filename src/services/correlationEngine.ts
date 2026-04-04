import type { CityState } from '../types/city'
import type { WeatherData } from './realDataService'

export interface CorrelationAlert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'warning'
  sectors: string[]
  recommendation: string
  confidence: number
}

export function runCorrelationEngine(
  state: CityState,
  weather: WeatherData
): CorrelationAlert[] {
  const results: CorrelationAlert[] = []
  const hour = new Date().getHours()
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
  const isNight = hour >= 22 || hour <= 6

  const getKpi = (sector: string, id: string) =>
    state.sectors[sector as keyof typeof state.sectors]?.kpis.find(k => k.id === id)?.value ?? 0

  const traffic    = getKpi('transport', 'traffic_congestion')
  const aqi        = getKpi('ecology', 'aqi')
  const electricity = getKpi('utilities', 'electricity')
  const incidents  = getKpi('safety', 'incidents')

  // Правило 1: Дождь + час пик + высокий трафик = каскад ДТП
  if (weather.isRaining && traffic > 82 && isPeakHour) {
    results.push({
      id: 'corr_rain_peak',
      title: 'Каскадный риск ДТП — час пик + дождь',
      description: `Дождь (${weather.precipitation} мм/ч) + загруженность ${traffic}% в час пик. Вероятность аварий выше на 47%.`,
      severity: 'critical',
      sectors: ['transport', 'safety'],
      recommendation: 'Развернуть доп. экипажи ДПС на Аль-Фараби, Абая, Саина. Снизить лимит скорости на 20 км/ч.',
      confidence: 87,
    })
  }

  // Правило 2: Снегопад + ночь = утренний паралич дорог
  if (weather.isSnowing && isNight) {
    results.push({
      id: 'corr_snow_night',
      title: 'Прогноз: транспортный коллапс к утру',
      description: `Снегопад ночью → к 08:00 трафик вырастет до ~${Math.min(99, traffic + 25)}%. Риск блокировки магистралей.`,
      severity: 'warning',
      sectors: ['transport', 'utilities'],
      recommendation: 'Немедленно развернуть уборочную технику на Аль-Фараби, Абая, Тимирязева. Запас реагентов.',
      confidence: 82,
    })
  }

  // Правило 3: Высокий AQI + безветрие + ночь = пиковое загрязнение к утру
  if (aqi > 85 && weather.windSpeed < 5 && isNight) {
    results.push({
      id: 'corr_aqi_night',
      title: 'Прогноз: AQI +30% к утру',
      description: `Безветрие (${weather.windSpeed} км/ч) не рассеивает смог. AQI ${aqi} вырастет до ~${Math.round(aqi * 1.3)} к 08:00.`,
      severity: aqi > 110 ? 'critical' : 'warning',
      sectors: ['ecology'],
      recommendation: 'Ограничить пром. выбросы с 22:00 до 08:00. Предупредить жителей о выходе на улицу.',
      confidence: 78,
    })
  }

  // Правило 4: Пиковая электросеть = риск каскадного отключения
  if (electricity > 93) {
    const tempFactor = weather.temperature > 35 ? 'кондиционеры' : weather.temperature < -10 ? 'обогрев' : 'нагрузка'
    results.push({
      id: 'corr_electricity_peak',
      title: `Риск каскадного отключения (${electricity}%)`,
      description: `Нагрузка ${electricity}% — критический порог 95%. Причина: ${tempFactor} (${weather.temperature > 0 ? '+' : ''}${weather.temperature}°C).`,
      severity: electricity > 96 ? 'critical' : 'warning',
      sectors: ['utilities', 'safety'],
      recommendation: 'Включить резервные подстанции. Ограничить промышленное потребление. Готовить аварийные бригады.',
      confidence: 91,
    })
  }

  // Правило 5: Туман + час пик = риск ДТП
  if (weather.isFoggy && isPeakHour) {
    results.push({
      id: 'corr_fog_peak',
      title: 'Туман + час пик — видимость ограничена',
      description: `Туман при ${traffic}% загруженности. Видимость < 200м на въездах в город.`,
      severity: 'warning',
      sectors: ['transport'],
      recommendation: 'Включить предупреждения на информационных табло. Рекомендовать водителям включить ПТФ.',
      confidence: 73,
    })
  }

  // Правило 6: Рост инцидентов ночью
  if (incidents > 25 && isNight) {
    results.push({
      id: 'corr_crime_night',
      title: 'Рост ночных вызовов экстренных служб',
      description: `${incidents} инцидентов — выше нормы на ~40%. Концентрация: Алмалинский, Турксибский районы.`,
      severity: 'warning',
      sectors: ['safety'],
      recommendation: 'Усилить патрулирование. Задействовать доп. экипажи в ночных точках.',
      confidence: 74,
    })
  }

  return results
}
