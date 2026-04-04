import type { CorrelationAlert } from '../services/correlationEngine'
import type { AnomalyItem } from '../App'

const sectorIcon: Record<string, string> = {
  transport: 'T', ecology: 'E', safety: 'S', utilities: 'U',
}

interface Props {
  correlations: CorrelationAlert[]
  anomalies?: AnomalyItem[]
}

export function CorrelationPanel({ correlations, anomalies = [] }: Props) {
  if (correlations.length === 0 && anomalies.length === 0) return null

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔗</span>
        <div>
          <h2 className="text-sm font-bold text-white">Движок корреляций</h2>
          <p className="text-[11px] text-slate-500">Кросс-доменные предупреждения · AI алгоритм</p>
        </div>
        <span className="ml-auto text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
          {correlations.length} паттерн{correlations.length > 1 ? 'а' : ''}
        </span>
      </div>

      {/* Корреляции */}
      <div className="flex flex-col gap-3">
        {correlations.map(corr => (
          <div
            key={corr.id}
            className={`rounded-xl border p-4 ${corr.severity === 'critical'
                ? 'border-red-500/40 bg-red-500/8'
                : 'border-yellow-500/30 bg-yellow-500/5'
              }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔗</span>
                <p className="text-sm font-semibold text-white leading-tight">{corr.title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 border border-purple-400/30 bg-purple-400/10 rounded-full px-2 py-0.5">
                  <span className="text-[10px] font-bold text-purple-300">{corr.confidence}%</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${corr.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'
                  }`}>
                  {corr.severity === 'critical' ? 'КРИТИЧНО' : 'ВНИМАНИЕ'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-2">{corr.description}</p>

            <div className="flex items-center gap-1.5 mb-2">
              {corr.sectors.map(s => (
                <span key={s} className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  {sectorIcon[s]} {s}
                </span>
              ))}
              <span className="text-[9px] text-purple-400 ml-1">↔ связь</span>
            </div>

            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <p className="text-[11px] text-slate-300">
                <span className="font-semibold text-white">Рекомендация: </span>
                {corr.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Аномалии Z-score */}
      {anomalies.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔍</span>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Аномалии (Z-score)
            </p>
            <span className="ml-auto text-[10px] text-slate-500">{anomalies.length} найдено</span>
          </div>
          <div className="flex flex-col gap-2">
            {anomalies.map(a => (
              <div key={a.kpiId} className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 flex items-center gap-3">
                <span className="text-base">{sectorIcon[a.sectorKey]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">{a.kpiLabel}</p>
                  <p className="text-[10px] text-slate-500">
                    {a.currentValue} {a.unit} · {a.sectorLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm">{a.direction === 'up' ? '📈' : a.direction === 'down' ? '📉' : '➡️'}</span>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-indigo-300">Z={a.zScore.toFixed(1)}</p>
                    <p className="text-[9px] text-slate-600">аномалия</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
