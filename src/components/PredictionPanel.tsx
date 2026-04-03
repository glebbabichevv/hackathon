import type { PredictionSeries } from '../services/predictionEngine'

const riskColor = { critical: '#ef4444', warning: '#f59e0b', normal: '#00e676' }
const trendIcon = { rising: '↗', falling: '↘', stable: '→' }

interface Props {
  predictions: PredictionSeries[]
}

export function PredictionPanel({ predictions }: Props) {
  const relevant = predictions.filter(p => p.predictions.length > 0)
  if (relevant.length === 0) return null

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📈</span>
        <div>
          <h2 className="text-sm font-bold text-white">Прогноз KPI</h2>
          <p className="text-[11px] text-slate-500">Линейная регрессия · собственный алгоритм</p>
        </div>
        <span className="ml-auto text-[10px] text-slate-500">1ч / 2ч / 4ч</span>
      </div>

      <div className="flex flex-col gap-4">
        {relevant.map(series => {
          const maxRisk = series.predictions.reduce((worst, p) => {
            const order = { critical: 3, warning: 2, normal: 1 }
            return order[p.riskLevel] > order[worst] ? p.riskLevel : worst
          }, 'normal' as 'critical' | 'warning' | 'normal')

          return (
            <div key={series.kpiId} className="flex flex-col gap-2">
              {/* KPI name + threshold warning */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium text-slate-300"
                  >
                    {series.kpiLabel}
                  </span>
                  {series.estimatedTimeToThreshold && (
                    <span className="text-[10px] text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                      ⚠️ порог через {series.estimatedTimeToThreshold}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {series.current} {series.unit}
                </span>
              </div>

              {/* Prediction bars */}
              <div className="grid grid-cols-3 gap-2">
                {series.predictions.map(pred => {
                  const color = riskColor[pred.riskLevel]
                  return (
                    <div
                      key={pred.label}
                      className="rounded-lg p-2 border"
                      style={{ borderColor: `${color}30`, background: `${color}08` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500">{pred.label}</span>
                        <span className="text-[10px]" style={{ color }}>
                          {trendIcon[pred.trend]}
                        </span>
                      </div>
                      <p className="text-sm font-bold" style={{ color }}>
                        {pred.value} <span className="text-[10px] font-normal text-slate-500">{series.unit}</span>
                      </p>
                      {/* Confidence bar */}
                      <div className="mt-1.5 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pred.confidence}%`, background: color }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-600 mt-0.5">{pred.confidence}% уверен.</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
