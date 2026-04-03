import type { CityState, Sector, TimePoint } from '../types/city'

// Generate realistic time series data for last 24 hours
function genHistory(base: number, variance: number, spike?: { hour: number; val: number }): TimePoint[] {
  const now = new Date()
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now.getTime() - (23 - i) * 3600000)
    const label = `${h.getHours().toString().padStart(2, '0')}:00`
    let v = base + (Math.random() - 0.5) * variance
    if (spike && i === spike.hour) v = spike.val
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
    traffic_congestion: genHistory(55, 20, { hour: 17, val: 91 }),
    avg_speed: genHistory(38, 15, { hour: 17, val: 18 }),
    accidents: genHistory(3, 3, { hour: 17, val: 7 }),
    public_transport: genHistory(75, 15, { hour: 7, val: 55 }),
  },
  alerts: [
    {
      id: 'tr_1',
      sector: 'transport',
      title: 'Критический затор на Ленинском проспекте',
      description: 'Пробка 9 баллов, скорость потока 12 км/ч. Причина: ДТП с участием 3 автомобилей.',
      severity: 'critical',
      timestamp: '08:47',
      location: 'Ленинский просп., 45–52',
      actionRequired: 'Перенаправить трафик через ул. Победы. Выслать эвакуатор.',
      lat: 43.2507, lng: 76.9152,
    },
    {
      id: 'tr_2',
      sector: 'transport',
      title: 'Нарушение графика трамваев №5 и №8',
      description: 'Задержка 15–22 мин, интервал увеличен вдвое.',
      severity: 'warning',
      timestamp: '07:30',
      location: 'Маршруты №5, №8',
      actionRequired: 'Выпустить резервные составы. Уведомить пассажиров через табло.',
      lat: 43.2555, lng: 76.9310,
    },
  ],
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
    aqi: genHistory(85, 40, { hour: 20, val: 168 }),
    co2: genHistory(430, 60),
    noise: genHistory(62, 15, { hour: 18, val: 78 }),
    water_quality: genHistory(96, 4),
  },
  alerts: [
    {
      id: 'ec_1',
      sector: 'ecology',
      title: 'Превышение PM2.5 в Северном районе',
      description: 'AQI достиг 168 — уровень "Вредный". Источник: промзона + безветрие.',
      severity: 'critical',
      timestamp: '20:15',
      location: 'Северный р-н, ст. Заводская',
      actionRequired: 'Ограничить выбросы предприятий. Рекомендовать жителям оставаться дома.',
      lat: 43.3055, lng: 76.9420,
    },
  ],
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
    incidents: genHistory(16, 8, { hour: 22, val: 31 }),
    response_time: genHistory(8.5, 3, { hour: 17, val: 14 }),
    cctv: genHistory(86, 5),
    fire_hazard: genHistory(2, 2),
  },
  alerts: [
    {
      id: 'sf_1',
      sector: 'safety',
      title: 'Рост правонарушений в ночное время',
      description: '5 инцидентов за последние 2 часа в Восточном районе (+150% к норме).',
      severity: 'critical',
      timestamp: '22:30',
      location: 'Восточный р-н, ул. Мира',
      actionRequired: 'Усилить патрулирование. Активировать дополнительные камеры в секторе.',
      lat: 43.2680, lng: 77.0055,
    },
    {
      id: 'sf_2',
      sector: 'safety',
      title: 'Перегрузка диспетчерской 112',
      description: 'Среднее время ожидания ответа 4.2 мин (норма < 1 мин).',
      severity: 'warning',
      timestamp: '21:55',
      actionRequired: 'Задействовать резервных операторов. Переключить часть вызовов.',
      lat: 43.2620, lng: 76.9380,
    },
  ],
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
      value: 94,
      unit: '% мощн.',
      trend: +8,
      threshold: { warning: 85, critical: 95 },
      severity: 'warning',
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
    electricity: genHistory(78, 18, { hour: 19, val: 97 }),
    water_pressure: genHistory(3.8, 0.6, { hour: 6, val: 2.8 }),
    outages: genHistory(1, 2, { hour: 14, val: 5 }),
    heating: genHistory(98, 3),
  },
  alerts: [
    {
      id: 'ut_1',
      sector: 'utilities',
      title: 'Пиковая нагрузка на электросеть',
      description: 'Потребление 94% от расчётной мощности. Риск каскадного отключения.',
      severity: 'critical',
      timestamp: '19:05',
      actionRequired: 'Включить резервные подстанции. Ввести лимит для промышленных потребителей.',
      lat: 43.2580, lng: 76.9450,
    },
    {
      id: 'ut_2',
      sector: 'utilities',
      title: 'Прорыв водопровода на ул. Гагарина',
      description: 'Падение давления на 18%. ~2400 жителей без горячей воды.',
      severity: 'critical',
      timestamp: '06:12',
      location: 'Ул. Гагарина, д. 18',
      actionRequired: 'Выслать аварийную бригаду. Подать водовозы в затронутые дома.',
      lat: 43.2420, lng: 76.9530,
    },
    {
      id: 'ut_3',
      sector: 'utilities',
      title: 'Плановая замена труб задерживается',
      description: 'Ремонт ул. Советская: отставание от графика 5 дней.',
      severity: 'warning',
      timestamp: '14:00',
      location: 'Ул. Советская, 31–47',
      actionRequired: 'Согласовать дополнительные ресурсы подрядчика.',
      lat: 43.2710, lng: 76.9480,
    },
  ],
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
