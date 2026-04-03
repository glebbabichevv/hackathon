import { useState, useEffect, useCallback, useRef } from 'react'
import { cityData, refreshData } from './data/mockData'
import type { CityState, AIAnalysis, SectorKey } from './types/city'
import { analyzeCity } from './services/aiService'
import { generateIncident, generateCrisis } from './services/incidentGenerator'
import { CityHeader } from './components/CityHeader'
import { SectorPanel } from './components/SectorPanel'
import { AlertPanel } from './components/AlertPanel'
import { AIAdvisor } from './components/AIAdvisor'
import { OverviewRadar } from './components/OverviewRadar'
import { CityMap } from './components/CityMap'
import { ChatPanel } from './components/ChatPanel'
import { ToastContainer, type Toast } from './components/ToastContainer'

const TABS = [
  { id: 'all', label: 'Все секторы' },
  { id: 'map', label: '🗺️ Карта' },
  { id: 'chat', label: '💬 ИИ Чат' },
  { id: 'transport', label: '🚗 Транспорт' },
  { id: 'ecology', label: '🌿 Экология' },
  { id: 'safety', label: '🛡️ Безопасность' },
  { id: 'utilities', label: '⚙️ ЖКХ' },
]

export default function App() {
  const [state, setState] = useState<CityState>(cityData)
  const [activeTab, setActiveTab] = useState('all')
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString('ru-RU'))
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCrisis, setIsCrisis] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [analysis, setAnalysis] = useState<AIAnalysis>({
    summary: '',
    whatHappening: '',
    howCritical: '',
    whatToDo: '',
    predictions: [],
    loading: false,
  })

  const pendingAnalysis = useRef(0)

  const allAlerts = Object.values(state.sectors).flatMap(s => s.alerts)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleRefreshData = useCallback(() => {
    setState(refreshData())
    setLastUpdate(new Date().toLocaleTimeString('ru-RU'))
  }, [])

  const handleAnalyze = useCallback(() => {
    analyzeCity(state, partial => {
      setAnalysis(prev => ({ ...prev, ...partial }))
    })
  }, [state])

  const addIncidentToState = useCallback((
    incident: NonNullable<Awaited<ReturnType<typeof generateIncident>>>
  ) => {
    setState(prev => {
      const sector = prev.sectors[incident.sector as SectorKey]
      if (!sector) return prev
      return {
        ...prev,
        overallScore: incident.severity === 'critical'
          ? Math.max(10, prev.overallScore - 4)
          : incident.severity === 'warning'
            ? Math.max(10, prev.overallScore - 1)
            : prev.overallScore,
        sectors: {
          ...prev.sectors,
          [incident.sector]: {
            ...sector,
            alerts: [incident, ...sector.alerts].slice(0, 10),
          },
        },
      }
    })
    setLastUpdate(new Date().toLocaleTimeString('ru-RU'))

    // Mark as new (badge clears after 45s)
    setNewAlertIds(prev => new Set([...prev, incident.id]))
    setTimeout(() => {
      setNewAlertIds(prev => { const s = new Set(prev); s.delete(incident.id); return s })
    }, 45000)

    // Toast notification
    setToasts(prev => [
      ...prev.slice(-3),
      { id: `toast_${incident.id}`, alert: incident },
    ])
  }, [])

  // Auto-generate incident every 60s
  useEffect(() => {
    const id = setInterval(async () => {
      if (isGenerating) return
      setIsGenerating(true)
      try {
        const incident = await generateIncident(state)
        if (incident) {
          addIncidentToState(incident)
          pendingAnalysis.current += 1
          if (pendingAnalysis.current >= 2) {
            pendingAnalysis.current = 0
            setTimeout(handleAnalyze, 1200)
          }
        }
      } finally {
        setIsGenerating(false)
      }
    }, 60000)
    return () => clearInterval(id)
  }, [state, isGenerating, addIncidentToState, handleAnalyze])

  // Auto-refresh KPI values every 30s
  useEffect(() => {
    const id = setInterval(handleRefreshData, 30000)
    return () => clearInterval(id)
  }, [handleRefreshData])

  // Auto-analyze on mount
  useEffect(() => {
    handleAnalyze()
  }, [])

  const handleSimulateCrisis = useCallback(async () => {
    if (isCrisis) return
    setIsCrisis(true)
    try {
      const incidents = await generateCrisis(state)
      for (const incident of incidents) {
        addIncidentToState(incident)
        await new Promise(r => setTimeout(r, 700))
      }
      setTimeout(handleAnalyze, 1200)
    } finally {
      setIsCrisis(false)
    }
  }, [state, isCrisis, addIncidentToState, handleAnalyze])

  const sectors = Object.values(state.sectors)
  const visibleSectors =
    activeTab === 'all' || activeTab === 'map' || activeTab === 'chat'
      ? sectors
      : sectors.filter(s => s.key === activeTab)

  const filteredAlerts =
    activeTab === 'all' || activeTab === 'map' || activeTab === 'chat'
      ? allAlerts
      : allAlerts.filter(a => a.sector === activeTab)

  return (
    <div className="min-h-screen bg-[#060d1f] grid-bg text-slate-200">
      <CityHeader state={state} onRefresh={handleRefreshData} lastUpdate={lastUpdate} />

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">

        {/* Tabs + controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 text-sm px-4 py-2 rounded-xl border transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-cyan-400/20 border-cyan-400/60 text-cyan-300 font-semibold'
                    : 'border-[#1a3050] text-slate-400 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {tab.id === 'chat' && (
                  <span className="ml-1.5 text-[10px] bg-cyan-400/30 text-cyan-300 px-1.5 py-0.5 rounded-full">AI</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 border border-[#1a3050] rounded-lg px-3 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-cyan-400 animate-ping' : 'bg-green-400 animate-pulse'}`} />
              {isGenerating ? 'Генерирую...' : 'LIVE мониторинг'}
            </div>
            <button
              onClick={handleSimulateCrisis}
              disabled={isCrisis}
              className="flex items-center gap-2 text-xs font-semibold text-red-400 border border-red-500/40 hover:border-red-500/80 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl transition-all duration-200"
            >
              <span className={isCrisis ? 'animate-spin inline-block' : ''}>⚡</span>
              {isCrisis ? 'Симуляция...' : 'Симуляция кризиса'}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          {/* Left panel */}
          <div className="flex flex-col gap-6">
            {activeTab === 'map' && (
              <CityMap alerts={allAlerts} newAlertIds={newAlertIds} />
            )}
            {activeTab === 'chat' && (
              <ChatPanel state={state} />
            )}
            {activeTab !== 'map' && activeTab !== 'chat' && (
              <div className={`grid gap-6 ${activeTab === 'all' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {visibleSectors.map(sector => (
                  <SectorPanel key={sector.key} sector={sector} />
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            <AIAdvisor analysis={analysis} onRefresh={handleAnalyze} />
            <OverviewRadar state={state} />

            <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚨</span> Инциденты
                </h2>
                <div className="flex items-center gap-2">
                  {newAlertIds.size > 0 && (
                    <span className="text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded-full animate-pulse">
                      +{newAlertIds.size} новых
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{filteredAlerts.length} активных</span>
                </div>
              </div>
              <AlertPanel alerts={filteredAlerts} newAlertIds={newAlertIds} />
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600 py-4 border-t border-[#1a3050]">
          Smart City Management Dashboard · MVP · Алматы · AI-мониторинг в реальном времени
        </footer>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
