import type { CorrelationAlert } from '../services/correlationEngine'

const sectorIcon: Record<string, string> = {
  transport: '🚗', ecology: '🌿', safety: '🛡️', utilities: '⚙️',
}

interface Props {
  correlations: CorrelationAlert[]
}

export function CorrelationPanel({ correlations }: Props) {
  if (correlations.length === 0) return null

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

      <div className="flex flex-col gap-3">
        {correlations.map(corr => (
          <div
            key={corr.id}
            className={`rounded-xl border p-4 ${
              corr.severity === 'critical'
                ? 'border-red-500/40 bg-red-500/8'
                : 'border-yellow-500/30 bg-yellow-500/5'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔗</span>
                <p className="text-sm font-semibold text-white leading-tight">{corr.title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Confidence */}
                <div className="flex items-center gap-1 border border-purple-400/30 bg-purple-400/10 rounded-full px-2 py-0.5">
                  <span className="text-[10px] font-bold text-purple-300">{corr.confidence}%</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  corr.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'
                }`}>
                  {corr.severity === 'critical' ? 'КРИТИЧНО' : 'ВНИМАНИЕ'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-2">{corr.description}</p>

            {/* Sectors */}
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
    </div>
  )
}
