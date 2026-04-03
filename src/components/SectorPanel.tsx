import { useState } from 'react'
import type { Sector } from '../types/city'
import { KPICard } from './KPICard'
import { SectorChart } from './SectorChart'

interface Props {
  sector: Sector
}

export function SectorPanel({ sector }: Props) {
  const [selectedKpi, setSelectedKpi] = useState(sector.kpis[0].id)

  const critCount = sector.kpis.filter(k => k.severity === 'critical').length
  const warnCount = sector.kpis.filter(k => k.severity === 'warning').length

  return (
    <div
      className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-5 flex flex-col gap-4"
      style={{ borderLeftColor: sector.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{sector.icon}</span>
          <h2 className="text-lg font-bold text-white">{sector.label}</h2>
        </div>
        <div className="flex gap-2">
          {critCount > 0 && (
            <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-2 py-0.5 rounded-full font-medium">
              {critCount} критично
            </span>
          )}
          {warnCount > 0 && (
            <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 text-xs px-2 py-0.5 rounded-full font-medium">
              {warnCount} внимание
            </span>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {sector.kpis.map(kpi => (
          <button
            key={kpi.id}
            onClick={() => setSelectedKpi(kpi.id)}
            className="text-left focus:outline-none"
          >
            <div
              className={`transition-all duration-200 rounded-xl ${selectedKpi === kpi.id ? '' : 'opacity-80 hover:opacity-100'}`}
              style={selectedKpi === kpi.id ? { boxShadow: `0 0 0 2px ${sector.color}` } : {}}
            >
              <KPICard kpi={kpi} accentColor={sector.color} />
            </div>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400 font-medium">
            График за 24 часа:{' '}
            <span className="text-white">
              {sector.kpis.find(k => k.id === selectedKpi)?.label}
            </span>
          </p>
          <div className="flex gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="inline-block w-4 border-t border-dashed border-yellow-400" /> предупр.
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="inline-block w-4 border-t border-dashed border-red-400" /> критич.
            </span>
          </div>
        </div>
        <SectorChart sector={sector} kpiId={selectedKpi} />
      </div>
    </div>
  )
}
