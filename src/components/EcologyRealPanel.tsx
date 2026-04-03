import type { AirQualityData, WeatherData } from '../services/realDataService'
import type { OwmCurrentAir, OwmAirForecast } from '../services/owmService'
import { aqiLabel } from '../services/owmService'

interface Props {
  airQuality: AirQualityData
  weather: WeatherData
  owmAir?: OwmCurrentAir | null
  owmForecast?: OwmAirForecast[]
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function Metric({
  label, value, unit, max, color, norm, source,
}: {
  label: string; value: number; unit: string; max: number
  color: string; norm: string; source?: string
}) {
  const overNorm = value > parseFloat(norm)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{label}</span>
        <div className="flex items-center gap-1.5">
          {source && (
            <span className="text-[9px] text-green-400 flex items-center gap-0.5">
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" /> {source}
            </span>
          )}
          <span className="text-sm font-bold" style={{ color: overNorm ? '#ff6d00' : color }}>
            {value}
          </span>
          <span className="text-[10px] text-slate-500">{unit}</span>
        </div>
      </div>
      <Bar value={value} max={max} color={overNorm ? '#ff6d00' : color} />
      <div className="flex justify-between text-[9px] text-slate-600">
        <span>0</span>
        <span>норма ≤ {norm} {unit}</span>
      </div>
    </div>
  )
}

const OWM_AQI_COLORS = ['', '#00e676', '#76ff03', '#ffb300', '#ff6d00', '#ff1744']

export function EcologyRealPanel({ airQuality, weather, owmAir, owmForecast }: Props) {
  const aqiColors = ['#00e676', '#76ff03', '#ffb300', '#ff6d00', '#ff1744', '#9c27b0']
  const aqiIdx = Math.min(5, Math.floor(airQuality.europeanAqi / 20))
  const aqiColor = aqiColors[aqiIdx]

  // Следующие 6 часов из OWM прогноза
  const next6h = owmForecast?.slice(0, 6) ?? []

  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <div>
            <p className="text-xs font-bold text-green-400">Реальные данные качества воздуха</p>
            <p className="text-[10px] text-slate-500">Open-Meteo CAMS · OpenWeatherMap · Copernicus</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* OWM AQI badge */}
          {owmAir && (
            <div
              className="flex flex-col items-center px-2 py-1 rounded-lg border"
              style={{ borderColor: `${OWM_AQI_COLORS[owmAir.aqi]}40`, background: `${OWM_AQI_COLORS[owmAir.aqi]}15` }}
            >
              <span className="text-sm font-black" style={{ color: OWM_AQI_COLORS[owmAir.aqi] }}>
                {aqiLabel(owmAir.aqi)}
              </span>
              <span className="text-[9px] text-slate-500">OWM</span>
            </div>
          )}
          {/* CAMS AQI badge */}
          <div
            className="flex flex-col items-center px-3 py-1.5 rounded-xl border"
            style={{ borderColor: `${aqiColor}40`, background: `${aqiColor}15` }}
          >
            <span className="text-2xl font-black" style={{ color: aqiColor }}>{airQuality.europeanAqi}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: aqiColor }}>
              {airQuality.aqiLabel}
            </span>
            <span className="text-[9px] text-slate-500">EAQI</span>
          </div>
        </div>
      </div>

      {/* Metrics grid — CAMS + OWM сравнение */}
      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="PM2.5 (мелкие частицы)"
          value={owmAir ? Math.round(owmAir.pm2_5) : airQuality.pm25}
          unit="мкг/м³" max={75} color="#00e676" norm="25"
          source={owmAir ? 'OWM' : 'CAMS'}
        />
        <Metric
          label="PM10 (крупные частицы)"
          value={owmAir ? Math.round(owmAir.pm10) : airQuality.pm10}
          unit="мкг/м³" max={150} color="#00e676" norm="50"
          source={owmAir ? 'OWM' : 'CAMS'}
        />
        <Metric
          label="NO₂ (диоксид азота)"
          value={owmAir ? Math.round(owmAir.no2) : airQuality.no2}
          unit="мкг/м³" max={200} color="#ffb300" norm="40"
          source={owmAir ? 'OWM' : 'CAMS'}
        />
        <Metric
          label="O₃ (озон)"
          value={owmAir ? Math.round(owmAir.o3) : airQuality.ozone}
          unit="мкг/м³" max={240} color="#2979ff" norm="120"
          source={owmAir ? 'OWM' : 'CAMS'}
        />
        {owmAir && (
          <Metric
            label="CO (угарный газ)"
            value={Math.round(owmAir.co / 1000 * 10) / 10}
            unit="мг/м³" max={10} color="#ff9100" norm="10"
            source="OWM"
          />
        )}
      </div>

      {/* OWM 6-hour AQI forecast */}
      {next6h.length > 0 && (
        <div className="border-t border-green-500/20 pt-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Прогноз AQI на 6 часов — OpenWeatherMap
          </p>
          <div className="flex gap-2">
            {next6h.map((h, i) => {
              const color = OWM_AQI_COLORS[h.aqi] ?? '#64748b'
              const hour = new Date(h.dt * 1000).getHours()
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 rounded-lg py-2"
                  style={{ background: `${color}15`, border: `1px solid ${color}40` }}
                >
                  <span className="text-[10px] text-slate-400">{hour}:00</span>
                  <span className="text-xs font-bold" style={{ color }}>{aqiLabel(h.aqi)}</span>
                  <span className="text-[9px] text-slate-500">{Math.round(h.pm2_5)} PM</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weather conditions */}
      <div className="border-t border-green-500/20 pt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Температура</p>
          <p className="text-lg font-bold text-white">{weather.temperature > 0 ? '+' : ''}{weather.temperature}°C</p>
          <p className="text-[10px] text-green-400 flex items-center justify-center gap-0.5">
            <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" /> LIVE
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Ветер</p>
          <p className="text-lg font-bold text-white">{weather.windSpeed} <span className="text-sm font-normal">км/ч</span></p>
          <p className="text-[10px] text-slate-500">{weather.windSpeed > 30 ? '⚠️ Сильный' : 'Нормально'}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Состояние</p>
          <p className="text-xl">{weather.icon}</p>
          <p className="text-[10px] text-slate-400">{weather.condition}</p>
        </div>
      </div>
    </div>
  )
}
