import type { KPI, Severity } from '../types/city'

const severityConfig: Record<Severity, {
  border: string; glow: string; badge: string; badgeText: string; label: string; valueColor: string
}> = {
  critical: {
    border: 'border-red-500/50',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    badge: 'bg-red-500/20 border border-red-500/50 text-red-400',
    badgeText: '',
    label: 'КРИТИЧНО',
    valueColor: '#f87171',
  },
  warning: {
    border: 'border-yellow-500/40',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.12)]',
    badge: 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-400',
    badgeText: '',
    label: 'ВНИМАНИЕ',
    valueColor: '#facc15',
  },
  normal: {
    border: 'border-slate-700/60',
    glow: '',
    badge: 'bg-blue-500/10 border border-blue-500/25 text-blue-400',
    badgeText: '',
    label: 'НОРМА',
    valueColor: '#60a5fa',
  },
  good: {
    border: 'border-emerald-500/30',
    glow: '',
    badge: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
    badgeText: '',
    label: 'ХОРОШО',
    valueColor: '#34d399',
  },
}

interface Props {
  kpi: KPI
  accentColor: string
}

export function KPICard({ kpi, accentColor }: Props) {
  const cfg = severityConfig[kpi.severity]
  const trendUp = kpi.trend > 0
  const trendColor = kpi.trend > 0 ? 'text-red-400' : 'text-emerald-400'
  const fillPct = Math.min(100, (kpi.value / kpi.threshold.critical) * 100)

  // gradient bar: green → yellow → red based on fill
  const barColor = fillPct > 85 ? '#ef4444' : fillPct > 60 ? '#eab308' : accentColor

  return (
    <div
      className={`relative rounded-2xl border ${cfg.border} ${cfg.glow} bg-[#07111e] p-4 flex flex-col gap-3 transition-all duration-300 hover:brightness-110 overflow-hidden`}
    >
      {/* Top-right corner gradient accent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent)`, transform: 'translate(30%, -30%)' }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-slate-400 leading-tight pr-12">{kpi.label}</p>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {kpi.isLive && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400">
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-1.5">
        <span className="text-[2rem] font-black leading-none tabular-nums" style={{ color: cfg.valueColor }}>
          {kpi.value}
        </span>
        <span className="text-xs text-slate-500 mb-1 font-medium">{kpi.unit}</span>
        <span className={`ml-auto text-xs font-semibold ${trendColor} flex items-center gap-0.5`}>
          {trendUp ? '↑' : '↓'}{Math.abs(kpi.trend)}%
        </span>
      </div>

      {/* Threshold bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${fillPct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600">
          <span>0</span>
          <span>порог {kpi.threshold.critical} {kpi.unit}</span>
        </div>
      </div>
    </div>
  )
}
