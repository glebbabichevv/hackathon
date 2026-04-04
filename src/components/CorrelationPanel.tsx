import type { CorrelationAlert } from '../services/correlationEngine'
import type { AnomalyItem } from '../App'

const sectorBadge: Record<string, string> = {
  transport: 'T', ecology: 'E', safety: 'S', utilities: 'U',
}

interface Props {
  correlations: CorrelationAlert[]
  anomalies?: AnomalyItem[]
}

export function CorrelationPanel({ correlations, anomalies = [] }: Props) {
  if (correlations.length === 0 && anomalies.length === 0) return null

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-[#07111e] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      style={{ background: 'linear-gradient(135deg, rgba(7,17,30,1) 0%, rgba(10,8,28,1) 100%)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <h2 className="text-[13px] font-bold text-white">Корреляции</h2>
          <p className="text-[10px] text-slate-600">Кросс-доменный AI-анализ</p>
        </div>
        <span className="ml-auto text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/25 px-2 py-0.5 rounded-full">
          {correlations.length}
        </span>
      </div>

      {/* Корреляции */}
      <div className="flex flex-col gap-2.5">
        {correlations.map(corr => (
          <div
            key={corr.id}
            className={`rounded-xl border p-3.5 ${corr.severity === 'critical'
                ? 'border-red-500/25 bg-red-500/[0.05]'
                : 'border-yellow-500/20 bg-yellow-500/[0.04]'
              }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[12px] font-semibold text-white leading-tight">{corr.title}</p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5">{corr.confidence}%</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${corr.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-yellow-400/10 text-yellow-400 border border-yellow-500/30'}`}>
                  {corr.severity === 'critical' ? 'КРИТ' : 'ВНИ'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{corr.description}</p>

            <div className="flex items-center gap-1.5 mb-2">
              {corr.sectors.map(s => (
                <span key={s} className="text-[9px] font-bold text-slate-600 bg-white/[0.03] border border-slate-700/50 px-1.5 py-0.5 rounded">
                  {sectorBadge[s]}
                </span>
              ))}
              <span className="text-[9px] text-violet-500 ml-1 font-medium">↔ связь</span>
            </div>

            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-200">Рек.: </span>
                {corr.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Аномалии Z-score */}
      {anomalies.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Аномалии Z-score
            </p>
            <span className="ml-auto text-[10px] text-slate-600">{anomalies.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {anomalies.map(a => (
              <div key={a.kpiId} className="rounded-lg border border-indigo-500/15 bg-indigo-500/[0.04] px-3 py-2 flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                  {sectorBadge[a.sectorKey]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">{a.kpiLabel}</p>
                  <p className="text-[10px] text-slate-600">{a.currentValue} {a.unit}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-bold text-indigo-300">Z={a.zScore.toFixed(1)}</p>
                  <p className="text-[9px] text-slate-600">{a.direction === 'up' ? '↑' : a.direction === 'down' ? '↓' : '→'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
