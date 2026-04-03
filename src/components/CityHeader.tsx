import type { CityState } from '../types/city'
import type { WeatherData } from '../services/realDataService'

interface Props {
  state: CityState
  onRefresh: () => void
  currentTime: string
  currentDate: string
  weather?: WeatherData | null
  dataFetchedAt?: string
}

const scoreColor = (score: number) => {
  if (score >= 80) return '#00e676'
  if (score >= 60) return '#ffb300'
  if (score >= 40) return '#ff6d00'
  return '#ff1744'
}

const scoreLabel = (score: number) => {
  if (score >= 80) return 'СТАБИЛЬНО'
  if (score >= 60) return 'ВНИМАНИЕ'
  if (score >= 40) return 'ТРЕВОГА'
  return 'КРИЗИС'
}

export function CityHeader({ state, onRefresh, currentTime, currentDate, weather, dataFetchedAt }: Props) {
  const color = scoreColor(state.overallScore)
  const label = scoreLabel(state.overallScore)

  const allAlerts = Object.values(state.sectors).flatMap(s => s.alerts)
  const critCount = allAlerts.filter(a => a.severity === 'critical').length
  const warnCount = allAlerts.filter(a => a.severity === 'warning').length

  return (
    <header className="border-b border-[#1a3050] bg-[#060d1f] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">

        {/* Left: branding + score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-black">
              SC
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Smart City Dashboard</p>
              <p className="text-[10px] text-slate-500">{state.city} · Панель управленческих решений</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#1a3050]" />

          {/* City health score */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#1a3050" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={color} strokeWidth="4"
                  strokeDasharray={`${(state.overallScore / 100) * 113} 113`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
                {state.overallScore}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Индекс города</p>
              <p className="text-sm font-bold" style={{ color }}>{label}</p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">

          {/* Alert counters */}
          <div className="hidden sm:flex items-center gap-2">
            {critCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/40 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-red-400">{critCount} крит.</span>
              </div>
            )}
            {warnCount > 0 && (
              <div className="flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/40 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                <span className="text-xs font-bold text-yellow-400">{warnCount} пред.</span>
              </div>
            )}
          </div>

          {/* Weather widget */}
          {weather && (
            <div className="hidden md:flex items-center gap-2 border border-[#1a3050] rounded-lg px-3 py-1.5">
              <span className="text-lg">{weather.icon}</span>
              <div className="text-[11px] flex flex-col gap-0.5">
                <div>
                  <span className="text-white font-bold">{weather.temperature > 0 ? '+' : ''}{weather.temperature}°C</span>
                  <span className="text-slate-500 ml-1.5">{weather.condition}</span>
                </div>
                <div className="text-slate-500">
                  <span>💧 {weather.humidity}%</span>
                  <span className="ml-1.5">💨 {weather.windSpeed} км/ч</span>
                </div>
              </div>
              {dataFetchedAt && (
                <span className="flex items-center gap-1 text-[10px] text-green-400 border-l border-[#1a3050] pl-2">
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                  {dataFetchedAt}
                </span>
              )}
            </div>
          )}

          {/* Live clock */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-white tabular-nums">{currentTime}</span>
            <span className="text-[10px] text-slate-500">{currentDate} · Алматы</span>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="text-xs text-cyan-400 border border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-400/10 px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            ⟳
          </button>
        </div>
      </div>
    </header>
  )
}
