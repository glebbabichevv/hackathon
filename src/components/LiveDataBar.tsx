import { useEffect, useRef, useState } from 'react'
import type { RealCityData } from '../services/realDataService'

interface Props {
  data: RealCityData
}

function aqiColor(aqi: number): string {
  if (aqi <= 20) return '#00e676'
  if (aqi <= 40) return '#76ff03'
  if (aqi <= 60) return '#ffb300'
  if (aqi <= 80) return '#ff6d00'
  return '#ff1744'
}

export function LiveDataBar({ data }: Props) {
  const { weather, airQuality, fetchedAt } = data
  const trackRef = useRef<HTMLDivElement>(null)
  const [liveTime, setLiveTime] = useState(() => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

  // Живой таймер в ленте — тикает каждую секунду
  useEffect(() => {
    const id = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Анимация бесконечного скролла
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let pos = 0
    const half = el.scrollWidth / 2
    const id = setInterval(() => {
      pos += 0.6
      if (pos >= half) pos = 0
      el.style.transform = `translateX(-${pos}px)`
    }, 16)
    return () => clearInterval(id)
  }, [data])

  const aqi = airQuality.europeanAqi
  const aColor = aqiColor(aqi)

  const items = [
    { icon: weather.icon, label: 'Погода', value: `${weather.temperature > 0 ? '+' : ''}${weather.temperature}°C ${weather.condition}` },
    { icon: '💨', label: 'Ветер', value: `${weather.windSpeed} км/ч` },
    { icon: '💧', label: 'Влажность', value: `${weather.humidity}%` },
    { icon: '🌡️', label: 'Осадки', value: weather.precipitation > 0 ? `${weather.precipitation} мм/ч` : 'Нет' },
    { icon: '🌿', label: 'AQI (EAQI)', value: `${aqi}`, color: aColor, extra: airQuality.aqiLabel },
    { icon: '🔬', label: 'PM2.5', value: `${airQuality.pm25} мкг/м³`, warn: airQuality.pm25 > 25 },
    { icon: '🔬', label: 'PM10', value: `${airQuality.pm10} мкг/м³`, warn: airQuality.pm10 > 50 },
    { icon: '🏭', label: 'NO₂', value: `${airQuality.no2} мкг/м³`, warn: airQuality.no2 > 40 },
    { icon: '⚗️', label: 'O₃', value: `${airQuality.ozone} мкг/м³` },
    { icon: '🌫️', label: 'CO', value: `${airQuality.co} мг/м³` },
    { icon: '📡', label: 'Источник', value: 'OWM · Open-Meteo · CAMS · USGS · WAQI' },
    { icon: '🕐', label: 'Дата данных', value: fetchedAt },
    { icon: '⏱️', label: 'Сейчас', value: liveTime },
  ]

  // Дублируем для бесшовного скролла
  const allItems = [...items, ...items]

  return (
    <div className="border-b border-[#1a3050] bg-[#040b1a] overflow-hidden relative h-9 flex items-center">
      {/* LEFT: LIVE label */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-[#1a3050] h-full bg-[#060d1f] z-10">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest whitespace-nowrap">Live Data</span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden relative">
        <div ref={trackRef} className="flex items-center gap-0 will-change-transform" style={{ whiteSpace: 'nowrap' }}>
          {allItems.map((item, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 px-4 border-r border-[#1a3050]/60 h-9 flex-shrink-0">
              <span className="text-sm leading-none">{item.icon}</span>
              <span className="text-[10px] text-slate-600">{item.label}:</span>
              <span
                className="text-[11px] font-semibold"
                style={{ color: item.color ?? (item.warn ? '#ff6d00' : '#e2e8f0') }}
              >
                {item.value}
              </span>
              {item.extra && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${aColor}20`, color: aColor }}>
                  {item.extra}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: город */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-l border-[#1a3050] h-full bg-[#060d1f]">
        <span className="text-[10px] text-slate-500 whitespace-nowrap">📍 Алматы</span>
      </div>
    </div>
  )
}
