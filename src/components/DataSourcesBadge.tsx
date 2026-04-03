import type { AirQualityData, WeatherData } from '../services/realDataService'

interface Props {
  weather: WeatherData | null
  airQuality: AirQualityData | null
  fetchedAt: string
}

export function DataSourcesBadge({ weather, airQuality, fetchedAt }: Props) {
  if (!weather && !airQuality) return null

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] px-5 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Реальные данные подключены</span>
          <span className="text-xs text-slate-500">· обновлено {fetchedAt}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Open-Meteo Weather */}
          {weather && (
            <div className="flex items-center gap-2 border border-green-400/20 bg-green-400/5 rounded-lg px-3 py-1.5">
              <span className="text-base">{weather.icon}</span>
              <div>
                <p className="text-[10px] text-green-400 font-bold">Open-Meteo Weather</p>
                <p className="text-[11px] text-slate-300">
                  {weather.temperature > 0 ? '+' : ''}{weather.temperature}°C · {weather.humidity}% влаж. · 💨 {weather.windSpeed} км/ч
                  {weather.isRaining && ' · 🌧️ Дождь'}
                  {weather.isSnowing && ' · ❄️ Снег'}
                  {weather.isFoggy && ' · 🌫️ Туман'}
                </p>
              </div>
            </div>
          )}

          {/* Open-Meteo Air Quality */}
          {airQuality && (
            <div className="flex items-center gap-2 border border-green-400/20 bg-green-400/5 rounded-lg px-3 py-1.5">
              <span className="text-base">🌿</span>
              <div>
                <p className="text-[10px] text-green-400 font-bold">Open-Meteo CAMS (Copernicus)</p>
                <p className="text-[11px] text-slate-300">
                  AQI <span style={{ color: airQuality.aqiColor }} className="font-bold">{airQuality.europeanAqi} ({airQuality.aqiLabel})</span>
                  {' · '}PM2.5: {airQuality.pm25} · PM10: {airQuality.pm10} · NO₂: {airQuality.no2} мкг/м³
                </p>
              </div>
            </div>
          )}

          {/* Mock data sectors */}
          <div className="flex items-center gap-2 border border-slate-700/50 bg-slate-700/10 rounded-lg px-3 py-1.5">
            <span className="text-base">📊</span>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Симулированные данные</p>
              <p className="text-[11px] text-slate-500">Безопасность · ЖКХ (инциденты)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
