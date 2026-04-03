import type { CityState, Sector, TimePoint } from '../types/city'

type HistoryPattern = 'traffic' | 'electricity' | 'noise' | 'incidents' | 'flat'

// Умная история с паттернами по времени суток
function genSmartHistory(base: number, pattern: HistoryPattern, jitter = 0.04): TimePoint[] {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now.getTime() - (23 - i) * 3600000)
    const hour = h.getHours()
    const label = `${hour.toString().padStart(2, '0')}:00`
    let multiplier = 1.0

    if (pattern === 'traffic') {
      // Утренний пик 8-9, вечерний 18-19, ночью почти нет
      if (hour >= 8 && hour <= 9) multiplier = 1.45
      else if (hour >= 18 && hour <= 19) multiplier = 1.40
      else if (hour >= 7 && hour <= 10) multiplier = 1.20
      else if (hour >= 16 && hour <= 20) multiplier = 1.25
      else if (hour >= 12 && hour <= 13) multiplier = 1.10  // обеденный
      else if (hour >= 0 && hour <= 5) multiplier = 0.18
      else if (hour >= 22 || hour <= 6) multiplier = 0.30
    } else if (pattern === 'electricity') {
      // Пик 9-21, минимум ночью
      if (hour >= 9 && hour <= 12) multiplier = 1.12
      else if (hour >= 18 && hour <= 21) multiplier = 1.18  // вечерний пик освещение
      else if (hour >= 0 && hour <= 5) multiplier = 0.55
      else if (hour >= 6 && hour <= 8) multiplier = 0.80
    } else if (pattern === 'noise') {
      // Тихо ночью, громко днём и вечером
      if (hour >= 8 && hour <= 22) multiplier = 0.90 + (hour - 8) * 0.012
      else if (hour >= 0 && hour <= 5) multiplier = 0.45
      else multiplier = 0.60
    } else if (pattern === 'incidents') {
      // Пик вечером (18-23), минимум утром
      if (hour >= 18 && hour <= 23) multiplier = 1.35
      else if (hour >= 22 || hour <= 2) multiplier = 1.20
      else if (hour >= 3 && hour <= 7) multiplier = 0.50
    }
    // 'flat' — slight random only

    const noise = (Math.random() - 0.5) * base * jitter
    const v = Math.max(0, base * multiplier + noise)
    return { time: label, value: Math.round(v * 10) / 10 }
  })
}


const transportSector: Sector = {
  key: 'transport',
  label: 'Транспорт',
  icon: '🚗',
  color: '#2979ff',
  kpis: [
    {
      id: 'traffic_congestion',
      label: 'Загруженность дорог',
      value: 78,
      unit: '%',
      trend: +14,
      threshold: { warning: 60, critical: 80 },
      severity: 'warning',
      description: 'Средняя загруженность дорожной сети',
    },
    {
      id: 'avg_speed',
      label: 'Средняя скорость',
      value: 24,
      unit: 'км/ч',
      trend: -18,
      threshold: { warning: 30, critical: 20 },
      severity: 'warning',
      description: 'Средняя скорость потока в центре',
    },
    {
      id: 'accidents',
      label: 'ДТП за сутки',
      value: 7,
      unit: 'инц.',
      trend: +40,
      threshold: { warning: 5, critical: 10 },
      severity: 'warning',
      description: 'Количество зафиксированных ДТП',
    },
    {
      id: 'public_transport',
      label: 'Пунктуальность ОТ',
      value: 61,
      unit: '%',
      trend: -8,
      threshold: { warning: 75, critical: 60 },
      severity: 'warning',
      description: 'Доля рейсов по расписанию',
    },
  ],
  history: {
    traffic_congestion: genSmartHistory(55, 'traffic'),
    avg_speed: genSmartHistory(38, 'traffic', 0.06).map(p => ({ ...p, value: Math.round((60 - p.value * 0.55) * 10) / 10 })),
    accidents: genSmartHistory(3, 'incidents'),
    public_transport: genSmartHistory(75, 'flat', 0.08),
  },
  alerts: [],
}

const ecologySector: Sector = {
  key: 'ecology',
  label: 'Экология',
  icon: '🌿',
  color: '#00e676',
  kpis: [
    {
      id: 'aqi',
      label: 'Индекс качества воздуха',
      value: 142,
      unit: 'AQI',
      trend: +35,
      threshold: { warning: 100, critical: 150 },
      severity: 'warning',
      description: 'PM2.5/PM10, CO, NO₂, O₃ — суммарный AQI',
    },
    {
      id: 'co2',
      label: 'CO₂ (центр города)',
      value: 487,
      unit: 'ppm',
      trend: +12,
      threshold: { warning: 450, critical: 550 },
      severity: 'warning',
      description: 'Концентрация углекислого газа',
    },
    {
      id: 'noise',
      label: 'Уровень шума',
      value: 71,
      unit: 'дБ',
      trend: +5,
      threshold: { warning: 65, critical: 75 },
      severity: 'warning',
      description: 'Средний уровень шума в жилых зонах',
    },
    {
      id: 'water_quality',
      label: 'Качество воды',
      value: 94,
      unit: '%',
      trend: -2,
      threshold: { warning: 85, critical: 75 },
      severity: 'good',
      description: 'Соответствие нормам питьевой воды',
    },
  ],
  history: {
    aqi: genSmartHistory(85, 'traffic', 0.12),  // AQI хуже в час пик
    co2: genSmartHistory(430, 'traffic', 0.08),
    noise: genSmartHistory(62, 'noise'),
    water_quality: genSmartHistory(96, 'flat', 0.02),
  },
  alerts: [],
}

const safetySector: Sector = {
  key: 'safety',
  label: 'Безопасность',
  icon: '🛡️',
  color: '#ff6d00',
  kpis: [
    {
      id: 'incidents',
      label: 'Инциденты за сутки',
      value: 23,
      unit: 'случ.',
      trend: +28,
      threshold: { warning: 18, critical: 30 },
      severity: 'warning',
      description: 'Правонарушения, вызовы полиции/скорой',
    },
    {
      id: 'response_time',
      label: 'Время реагирования',
      value: 11.4,
      unit: 'мин',
      trend: +26,
      threshold: { warning: 10, critical: 15 },
      severity: 'warning',
      description: 'Среднее время прибытия экстренных служб',
    },
    {
      id: 'cctv',
      label: 'Покрытие CCTV',
      value: 84,
      unit: '%',
      trend: -3,
      threshold: { warning: 80, critical: 70 },
      severity: 'good',
      description: 'Доля территории под видеонаблюдением',
    },
    {
      id: 'fire_hazard',
      label: 'Пожарные вызовы',
      value: 3,
      unit: 'выз.',
      trend: 0,
      threshold: { warning: 5, critical: 8 },
      severity: 'normal',
      description: 'Активные вызовы пожарной службы',
    },
  ],
  history: {
    incidents: genSmartHistory(16, 'incidents'),
    response_time: genSmartHistory(8.5, 'traffic', 0.10),  // хуже в пробки
    cctv: genSmartHistory(86, 'flat', 0.02),
    fire_hazard: genSmartHistory(2, 'flat', 0.20),
  },
  alerts: [],
}

const utilitiesSector: Sector = {
  key: 'utilities',
  label: 'ЖКХ',
  icon: '⚙️',
  color: '#d500f9',
  kpis: [
    {
      id: 'electricity',
      label: 'Потребление эл-энергии',
      value: 82,
      unit: '% мощн.',
      trend: +3,
      threshold: { warning: 85, critical: 95 },
      severity: 'normal',
      description: 'Загрузка электросети от максимума',
    },
    {
      id: 'water_pressure',
      label: 'Давление водоснабж.',
      value: 3.1,
      unit: 'атм',
      trend: -18,
      threshold: { warning: 3.5, critical: 2.5 },
      severity: 'warning',
      description: 'Среднее давление в магистральных трубах',
    },
    {
      id: 'outages',
      label: 'Аварийных отключений',
      value: 4,
      unit: 'инц.',
      trend: +100,
      threshold: { warning: 2, critical: 5 },
      severity: 'warning',
      description: 'Активные аварийные отключения',
    },
    {
      id: 'heating',
      label: 'Теплоснабжение',
      value: 97,
      unit: '%',
      trend: 0,
      threshold: { warning: 90, critical: 80 },
      severity: 'good',
      description: 'Охват горячим водоснабжением и отоплением',
    },
  ],
  history: {
    electricity: genSmartHistory(68, 'electricity'),
    water_pressure: genSmartHistory(3.8, 'flat', 0.06),
    outages: genSmartHistory(1, 'flat', 0.40),
    heating: genSmartHistory(98, 'flat', 0.02),
  },
  alerts: [],
}

export const cityData: CityState = {
  timestamp: new Date().toLocaleString('ru-RU'),
  city: 'Алматы',
  overallScore: 62,
  overallSeverity: 'warning',
  sectors: {
    transport: transportSector,
    ecology: ecologySector,
    safety: safetySector,
    utilities: utilitiesSector,
  },
}

export function refreshData(): CityState {
  const updated = JSON.parse(JSON.stringify(cityData)) as CityState
  updated.timestamp = new Date().toLocaleString('ru-RU')
  // Small random fluctuations
  Object.values(updated.sectors).forEach(sector => {
    sector.kpis.forEach(kpi => {
      const delta = (Math.random() - 0.5) * kpi.value * 0.03
      kpi.value = Math.round((kpi.value + delta) * 10) / 10
    })
  })
  return updated
}
