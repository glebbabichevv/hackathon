import type { Alert, Severity } from '../types/city'

const severityStyle: Record<Severity, {
  dot: string; border: string; bg: string; badge: string; label: string
}> = {
  critical: {
    dot: 'bg-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/[0.06]',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/40',
    label: 'КРИТИЧНО',
  },
  warning: {
    dot: 'bg-yellow-400',
    border: 'border-yellow-500/25',
    bg: 'bg-yellow-500/[0.05]',
    badge: 'bg-yellow-400/15 text-yellow-400 border border-yellow-500/30',
    label: 'ВНИМАНИЕ',
  },
  normal: {
    dot: 'bg-blue-400',
    border: 'border-slate-700/50',
    bg: 'bg-slate-800/30',
    badge: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    label: 'ИНФО',
  },
  good: {
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/25',
    bg: 'bg-emerald-500/[0.04]',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    label: 'OK',
  },
}

const sectorLabel: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  safety: 'Безопасность',
  utilities: 'ЖКХ',
}

const sectorBadge: Record<string, string> = {
  transport: 'T',
  ecology: 'E',
  safety: 'S',
  utilities: 'U',
}

interface Props {
  alerts: Alert[]
  newAlertIds?: Set<string>
}

export function AlertPanel({ alerts, newAlertIds }: Props) {
  const sorted = [...alerts].sort((a, b) => {
    const orderNew = (newAlertIds?.has(b.id) ? 0 : 1) - (newAlertIds?.has(a.id) ? 0 : 1)
    if (orderNew !== 0) return orderNew
    const order = { critical: 0, warning: 1, normal: 2, good: 3 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map(alert => {
        const s = severityStyle[alert.severity]
        const isNew = newAlertIds?.has(alert.id)
        return (
          <div
            key={alert.id}
            className={`rounded-xl border ${s.border} ${s.bg} p-3.5 flex flex-col gap-2 transition-all duration-300 ${isNew ? 'ring-1 ring-cyan-400/40 shadow-[0_0_12px_rgba(14,165,233,0.12)]' : ''}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${s.dot} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                <p className="text-[13px] font-semibold text-white leading-tight">{alert.title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isNew && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-400 text-black">
                    NEW
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                  {s.label}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-[12px] text-slate-400 leading-relaxed pl-3.5">{alert.description}</p>

            {/* Action */}
            <div className="ml-3.5 rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-2">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-200">Действие: </span>
                {alert.actionRequired}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pl-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-medium">{sectorLabel[alert.sector]}</span>
                {alert.location && (
                  <span className="text-[10px] text-slate-600">· {alert.location}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-600">{alert.timestamp}</span>
                {alert.source ? (
                  <span className="text-[10px] text-emerald-500/70 border border-emerald-500/25 rounded px-1.5 py-0.5">
                    {sectorBadge[alert.sector]} {alert.source}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600/50 border border-slate-700/40 rounded px-1.5 py-0.5">
                    SIM
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="text-center py-10 text-slate-600 text-sm">
          Активных инцидентов нет
        </div>
      )}
    </div>
  )
}
