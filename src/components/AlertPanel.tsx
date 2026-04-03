import type { Alert, Severity } from '../types/city'

const severityStyle: Record<Severity, { dot: string; border: string; bg: string; label: string }> = {
  critical: { dot: 'bg-red-500', border: 'border-red-500/40', bg: 'bg-red-500/10', label: 'КРИТИЧНО' },
  warning: { dot: 'bg-yellow-400', border: 'border-yellow-400/40', bg: 'bg-yellow-400/10', label: 'ВНИМАНИЕ' },
  normal: { dot: 'bg-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/5', label: 'ИНФО' },
  good: { dot: 'bg-green-400', border: 'border-green-400/30', bg: 'bg-green-400/5', label: 'OK' },
}

const sectorLabel: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  safety: 'Безопасность',
  utilities: 'ЖКХ',
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
    <div className="flex flex-col gap-3">
      {sorted.map(alert => {
        const s = severityStyle[alert.severity]
        const isNew = newAlertIds?.has(alert.id)
        return (
          <div
            key={alert.id}
            className={`rounded-xl border ${s.border} ${s.bg} p-4 flex flex-col gap-2 transition-all duration-300 ${isNew ? 'ring-1 ring-cyan-400/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${s.dot} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                <p className="text-sm font-semibold text-white leading-tight">{alert.title}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isNew && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400 text-black animate-pulse">
                    NEW
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.dot === 'bg-red-500' ? 'bg-red-500 text-white' : s.dot === 'bg-yellow-400' ? 'bg-yellow-400 text-black' : 'bg-blue-400/20 text-blue-300'}`}>
                  {s.label}
                </span>
                <span className="text-xs text-slate-500">{alert.timestamp}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>

            {alert.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span>📍</span> {alert.location}
              </p>
            )}

            <div className="mt-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[11px] text-slate-300">
                <span className="font-semibold text-white">Действие: </span>
                {alert.actionRequired}
              </p>
            </div>

            <span className="text-[10px] text-slate-600 uppercase tracking-wider">{sectorLabel[alert.sector]}</span>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Активных инцидентов нет
        </div>
      )}
    </div>
  )
}
