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
      className="rounded-2xl bg-[#07111e] p-5 flex flex-col gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      style={{ border: '1px solid rgba(255,255,255,0.06)', borderLeft: `2px solid ${sector.color}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: sector.color + '18', border: `1px solid ${sector.color}40`, color: sector.color }}
          >
            {sector.icon}
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">{sector.label}</h2>
            <p className="text-[10px] text-slate-600">{sector.kpis.length} показателей</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {critCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
              {critCount} критично
            </span>
          )}
          {warnCount > 0 && (
            <span className="text-[10px] font-bold bg-yellow-400/10 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
              {warnCount} внимание
            </span>
          )}
          {critCount === 0 && warnCount === 0 && (
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              норма
            </span>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {sector.kpis.map(kpi => (
          <button
            key={kpi.id}
            onClick={() => setSelectedKpi(kpi.id)}
            className="text-left focus:outline-none"
          >
            <div
              className={`transition-all duration-200 rounded-2xl ${selectedKpi === kpi.id ? 'ring-2' : 'opacity-75 hover:opacity-100'}`}
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
          <p className="text-[11px] text-slate-500">
            24ч ·{' '}
            <span className="text-slate-300 font-medium">
              {sector.kpis.find(k => k.id === selectedKpi)?.label}
            </span>
          </p>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-yellow-500">
              <span className="inline-block w-3 border-t border-dashed border-yellow-500" /> предупр.
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <span className="inline-block w-3 border-t border-dashed border-red-500" /> критич.
            </span>
          </div>
        </div>
        <SectorChart sector={sector} kpiId={selectedKpi} />
      </div>
    </div>
  )
}
