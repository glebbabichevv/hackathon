import type { CityState } from '../types/city'
import type { WeatherData } from '../services/realDataService'

interface Props {
  state: CityState
  onRefresh: () => void
  currentTime: string
  currentDate: string
  weather?: WeatherData | null
  dataFetchedAt?: string
  roleLabel?: string
  roleIcon?: string
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

function RiseOSLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="36" x2="36" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="logoGrad2" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="36" height="36" rx="10" fill="url(#logoGrad2)" />
      <rect width="36" height="36" rx="10" fill="none" stroke="url(#logoGrad)" strokeWidth="1" strokeOpacity="0.6" />
      {/* Rising bars — city skyline / data bars */}
      <rect x="7"  y="22" width="4" height="8"  rx="1.5" fill="url(#logoGrad)" opacity="0.5" />
      <rect x="13" y="16" width="4" height="14" rx="1.5" fill="url(#logoGrad)" opacity="0.75" />
      <rect x="19" y="10" width="4" height="20" rx="1.5" fill="url(#logoGrad)" />
      <rect x="25" y="14" width="4" height="16" rx="1.5" fill="url(#logoGrad)" opacity="0.65" />
      {/* Rising arrow tip */}
      <path d="M21 7 L24 11 L18 11 Z" fill="url(#logoGrad)" />
    </svg>
  )
}

export function CityHeader({ state, onRefresh, currentTime, currentDate, weather, dataFetchedAt, roleLabel, roleIcon }: Props) {
  const color = scoreColor(state.overallScore)
  const label = scoreLabel(state.overallScore)

  const allAlerts = Object.values(state.sectors).flatMap(s => s.alerts)
  const critCount = allAlerts.filter(a => a.severity === 'critical').length
  const warnCount = allAlerts.filter(a => a.severity === 'warning').length

  return (
    <header className="border-b border-[#1a3050] bg-[#060d1f] sticky top-0 z-50">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">

        {/* Left: branding + score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <RiseOSLogo />
            <div>
              <p className="text-sm font-bold text-white leading-none tracking-widest uppercase">RiseOS</p>
              <p className="text-[10px] text-slate-500">{state.city} · Smart City Platform</p>
            </div>
          </div>

          {roleLabel && (
            <div className="hidden md:flex items-center gap-1.5 bg-cyan-400/10 border border-cyan-400/30 rounded-full px-2.5 py-1">
              {roleIcon && <span className="text-sm">{roleIcon}</span>}
              <span className="text-[11px] font-semibold text-cyan-300">{roleLabel}</span>
            </div>
          )}

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

          {/* Weather */}
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

          {/* Clock */}
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
