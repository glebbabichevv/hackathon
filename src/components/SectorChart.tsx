import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { Sector } from '../types/city'

interface Props {
  sector: Sector
  kpiId: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a1628] border border-[#1a3050] rounded-lg px-3 py-2 text-xs">
        <p className="text-slate-400">{label}</p>
        <p className="text-white font-bold">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

export function SectorChart({ sector, kpiId }: Props) {
  const data = sector.history[kpiId]
  const kpi = sector.kpis.find(k => k.id === kpiId)

  if (!data || !kpi) return null

  // Show only every 4th label
  const dataWithTick = data.map((d, i) => ({ ...d, showTick: i % 4 === 0 }))

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dataWithTick} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad_${kpiId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={sector.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={sector.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a3050" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#475569', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#1a3050' }}
            interval={3}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={kpi.threshold.warning}
            stroke="#ffb300"
            strokeDasharray="4 4"
            label={{ value: 'предупр.', fill: '#ffb300', fontSize: 9, position: 'right' }}
          />
          <ReferenceLine
            y={kpi.threshold.critical}
            stroke="#ff1744"
            strokeDasharray="4 4"
            label={{ value: 'критич.', fill: '#ff1744', fontSize: 9, position: 'right' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={sector.color}
            strokeWidth={2}
            fill={`url(#grad_${kpiId})`}
            dot={false}
            activeDot={{ r: 4, fill: sector.color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
