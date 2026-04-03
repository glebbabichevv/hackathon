import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { CityState, KPI, Sector } from '../types/city'

interface Props {
  state: CityState
}

function sectorScore(sector: Sector): number {
  const scores = sector.kpis.map((kpi: KPI) => {
    const ratio = kpi.value / kpi.threshold.critical
    return Math.max(0, Math.min(100, 100 - (ratio - 0.5) * 100))
  })
  return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
}

export function OverviewRadar({ state }: Props) {
  const data = Object.values(state.sectors).map(s => ({
    sector: s.label,
    score: sectorScore(s),
    fullMark: 100,
  }))

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-5">
      <h3 className="text-sm font-bold text-slate-300 mb-3">Индекс по секторам</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#1a3050" />
            <PolarAngleAxis
              dataKey="sector"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#475569', fontSize: 9 }}
              tickCount={4}
            />
            <Tooltip
              contentStyle={{ background: '#0a1628', border: '1px solid #1a3050', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#00d4ff' }}
            />
            <Radar
              name="Индекс"
              dataKey="score"
              stroke="#00d4ff"
              fill="#00d4ff"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ fill: '#00d4ff', r: 3 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
