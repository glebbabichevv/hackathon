import type { KPI, Severity } from '../types/city'

const severityConfig: Record<Severity, { border: string; bg: string; badge: string; label: string }> = {
  critical: {
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    badge: 'bg-red-500 text-white',
    label: 'КРИТИЧНО',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/5',
    badge: 'bg-yellow-500 text-black',
    label: 'ВНИМАНИЕ',
  },
  normal: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    badge: 'bg-blue-500/30 text-blue-300',
    label: 'НОРМА',
  },
  good: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/5',
    badge: 'bg-green-500/30 text-green-300',
    label: 'ХОРОШО',
  },
}

interface Props {
  kpi: KPI
  accentColor: string
}

export function KPICard({ kpi, accentColor }: Props) {
  const cfg = severityConfig[kpi.severity]
  const trendUp = kpi.trend > 0
  const trendColor = kpi.trend > 0 ? 'text-red-400' : 'text-green-400'

  return (
    <div
      className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-2 transition-all duration-300 hover:brightness-110`}
    >
      {/* severity badge */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.badge}`}>
          {cfg.label}
        </span>
        {kpi.isLive && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-1.5 py-0.5 rounded">
            <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* label */}
      <p className="text-xs text-slate-400 leading-tight pr-16">{kpi.label}</p>

      {/* value */}
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-white leading-none" style={{ color: accentColor }}>
          {kpi.value}
        </span>
        <span className="text-sm text-slate-400 mb-0.5">{kpi.unit}</span>
      </div>

      {/* trend */}
      <div className="flex items-center gap-1">
        <span className={`text-sm font-medium ${trendColor}`}>
          {trendUp ? '▲' : '▼'} {Math.abs(kpi.trend)}%
        </span>
        <span className="text-xs text-slate-500">к прошлому периоду</span>
      </div>

      {/* threshold bar */}
      <div className="mt-1">
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (kpi.value / kpi.threshold.critical) * 100)}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
          <span>0</span>
          <span>порог: {kpi.threshold.critical} {kpi.unit}</span>
        </div>
      </div>
    </div>
  )
}
