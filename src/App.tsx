import { useState, useEffect, useCallback, useRef } from 'react'
import { cityData } from './data/mockData'
import type { CityState, AIAnalysis, SectorKey } from './types/city'
import { analyzeCity } from './services/aiService'
import { generateIncident, generateCrisis } from './services/incidentGenerator'
import { fetchRealData, applyRealData, type RealCityData } from './services/realDataService'
import { CityHeader } from './components/CityHeader'
import { SectorPanel } from './components/SectorPanel'
import { AlertPanel } from './components/AlertPanel'
import { AIAdvisor } from './components/AIAdvisor'
import { OverviewRadar } from './components/OverviewRadar'
import { CityMap } from './components/CityMap'
import { ChatPanel } from './components/ChatPanel'
import { ToastContainer, type Toast } from './components/ToastContainer'
import { LiveDataBar } from './components/LiveDataBar'
import { EcologyRealPanel } from './components/EcologyRealPanel'
import { AIProviderSelector, type AIProvider } from './components/AIProviderSelector'
import { CorrelationPanel } from './components/CorrelationPanel'
import { PredictionPanel } from './components/PredictionPanel'
import { RoleSelector } from './components/RoleSelector'
import { ExportButton } from './components/ExportButton'
import { fetchEarthquakes, earthquakeToAlert } from './services/earthquakeService'
import { fetchAlmatyAirStations, waqiStationToAlert } from './services/waqiService'
import { fetchHereTrafficIncidents, hereIncidentToAlert } from './services/hereService'
import { fetchOwmAirPollution, fetchOwmAirForecast, type OwmCurrentAir, type OwmAirForecast } from './services/owmService'
import { fetchAlmatyTraffic, trafficToKpiValue, trafficRoutesToAlerts, type RouteTraffic } from './services/twogisService'
import { fetchNewsIncidents } from './services/newsIncidentService'
import { fetchLowAltitudeAircraft, aircraftToAlert } from './services/openSkyService'
import { runCorrelationEngine, type CorrelationAlert } from './services/correlationEngine'
import { predictKpi, type PredictionSeries } from './services/predictionEngine'
import { detectAnomaly } from './services/anomalyDetector'

export interface AnomalyItem {
  kpiId: string
  kpiLabel: string
  sectorKey: string
  sectorLabel: string
  zScore: number
  direction: 'up' | 'down' | 'stable'
  currentValue: number
  unit: string
}

const TABS = [
  { id: 'all',       label: 'Все секторы'  },
  { id: 'map',       label: 'Карта'        },
  { id: 'chat',      label: 'ИИ Чат'       },
  { id: 'transport', label: 'Транспорт'    },
  { id: 'ecology',   label: 'Экология'     },
  { id: 'safety',    label: 'Безопасность' },
  { id: 'utilities', label: 'ЖКХ'          },
]

export default function App() {
  const [state, setState] = useState<CityState>(cityData)
  const [activeTab, setActiveTab] = useState('all')
  const [now, setNow] = useState(new Date())
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCrisis, setIsCrisis] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [realData, setRealData] = useState<RealCityData | null>(null)
  const [aiProvider, setAiProvider] = useState<AIProvider>('claude')
  const [ollamaModel, setOllamaModel] = useState('llama3.2')
  const [correlations, setCorrelations] = useState<CorrelationAlert[]>([])
  const [predictions, setPredictions] = useState<PredictionSeries[]>([])
  const [roleSelected, setRoleSelected] = useState(() => !!sessionStorage.getItem('sc_role'))
  const [roleLabel, setRoleLabel] = useState(() => sessionStorage.getItem('sc_role_label') ?? '')
  const [roleIcon, setRoleIcon] = useState(() => sessionStorage.getItem('sc_role_icon') ?? '')
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([])
  const [owmAir, setOwmAir] = useState<OwmCurrentAir | null>(null)
  const [owmForecast, setOwmForecast] = useState<OwmAirForecast[]>([])
  const [trafficRoutes, setTrafficRoutes] = useState<RouteTraffic[]>([])
  const [analysis, setAnalysis] = useState<AIAnalysis>({
    summary: '',
    whatHappening: '',
    howCritical: '',
    whatToDo: '',
    predictions: [],
    loading: false,
  })

  const pendingAnalysis = useRef(0)
  const sectorAlerts = Object.values(state.sectors).flatMap(s => s.alerts)

  // Координаты для корреляционных алертов на карте (по сектору)
  const CORR_COORDS: Record<string, [number, number]> = {
    transport: [43.2600, 76.9380],
    ecology: [43.2900, 76.8900],
    safety: [43.2680, 76.9420],
    utilities: [43.2510, 76.9460],
  }
  const correlationMapAlerts = correlations.map(c => {
    const mainSector = (c.sectors[0] ?? 'safety') as import('./types/city').SectorKey
    const [lat, lng] = CORR_COORDS[mainSector] ?? [43.257, 76.940]
    return {
      id: c.id,
      sector: mainSector,
      title: c.title,
      description: c.description,
      severity: c.severity,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      actionRequired: c.recommendation,
      lat, lng,
      source: `AI Корреляция (${c.confidence}%)`,
    } satisfies import('./types/city').Alert
  })

  const trafficMapAlerts = trafficRoutesToAlerts(trafficRoutes)
  const allAlerts = [...sectorAlerts, ...correlationMapAlerts, ...trafficMapAlerts]

  // ── Живые часы — тикают каждую секунду ─────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Обновляем timestamp в стейте города каждую минуту ──────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setState(prev => ({ ...prev, timestamp: new Date().toLocaleString('ru-RU') }))
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleRefreshData = useCallback(() => {
    setState(prev => {
      const updated = JSON.parse(JSON.stringify(prev)) as CityState
      updated.timestamp = new Date().toLocaleString('ru-RU')
      Object.values(updated.sectors).forEach(sector => {
        sector.kpis.forEach(kpi => {
          const delta = (Math.random() - 0.5) * kpi.value * 0.03
          kpi.value = Math.round((kpi.value + delta) * 10) / 10
        })
      })
      return updated
    })
  }, [])

  const handleAnalyze = useCallback(() => {
    analyzeCity(state, partial => {
      setAnalysis(prev => ({ ...prev, ...partial }))
    }, aiProvider, ollamaModel)
  }, [state, aiProvider, ollamaModel])

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

    setNewAlertIds(prev => new Set([...prev, incident.id]))
    setTimeout(() => {
      setNewAlertIds(prev => { const s = new Set(prev); s.delete(incident.id); return s })
    }, 45000)

    setToasts(prev => [
      ...prev.slice(-3),
      { id: `toast_${incident.id}`, alert: incident },
    ])
  }, [])

  // ── Генерация инцидентов: 3 сразу при старте + по одному каждые 60 сек ──────
  useEffect(() => {
    const generate = async () => {
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
    }

    // 3 инцидента при старте с небольшим разбросом
    setTimeout(generate, 500)
    setTimeout(generate, 2500)
    setTimeout(generate, 5000)

    const id = setInterval(generate, 60000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI флуктуации каждые 30 сек ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(handleRefreshData, 30000)
    return () => clearInterval(id)
  }, [handleRefreshData])

  // ── Погода + AQI каждые 2 минуты ───────────────────────────────────────────
  const fetchAndApplyRealData = useCallback(async () => {
    const data = await fetchRealData()
    if (data) {
      setRealData(data)
      setState(prev => applyRealData(prev, data))
    }
  }, [])

  useEffect(() => {
    fetchAndApplyRealData()
    const id = setInterval(fetchAndApplyRealData, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchAndApplyRealData])

  // ── USGS землетрясения + WAQI станции каждые 10 мин ────────────────────────
  useEffect(() => {
    const load = async () => {
      const [quakes, stations] = await Promise.allSettled([
        fetchEarthquakes(),
        fetchAlmatyAirStations(),
      ])
      const newAlerts = [
        ...(quakes.status === 'fulfilled' ? quakes.value.slice(0, 5).map(earthquakeToAlert) : []),
        ...(stations.status === 'fulfilled' ? stations.value.map(waqiStationToAlert).filter((a): a is NonNullable<typeof a> => a !== null) : []),
      ]
      if (newAlerts.length === 0) return
      setState(prev => {
        const updated = { ...prev, sectors: { ...prev.sectors } }
        for (const alert of newAlerts) {
          const sec = updated.sectors[alert.sector as SectorKey]
          if (!sec) continue
          const filtered = sec.alerts.filter(a => a.id !== alert.id)
          updated.sectors[alert.sector as SectorKey] = {
            ...sec,
            alerts: [alert, ...filtered].slice(0, 12),
          }
        }
        return updated
      })
    }
    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── HERE Traffic ДТП каждые 2 мин ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const incidents = await fetchHereTrafficIncidents()
      if (incidents.length === 0) return
      const alerts = incidents.map(hereIncidentToAlert)
      setState(prev => {
        const sec = prev.sectors['transport' as SectorKey]
        if (!sec) return prev
        const filtered = sec.alerts.filter(a => !a.id.startsWith('here_'))
        return {
          ...prev,
          sectors: {
            ...prev.sectors,
            transport: { ...sec, alerts: [...alerts, ...filtered].slice(0, 15) },
          },
        }
      })
    }
    load()
    const id = setInterval(load, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── OpenWeatherMap AQI каждые 30 мин ───────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [current, forecast] = await Promise.allSettled([
        fetchOwmAirPollution(),
        fetchOwmAirForecast(),
      ])
      if (current.status === 'fulfilled' && current.value) setOwmAir(current.value)
      if (forecast.status === 'fulfilled') setOwmForecast(forecast.value)
    }
    load()
    const id = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── 2GIS трафик каждые 10 мин ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const routes = await fetchAlmatyTraffic()
      if (routes.length === 0) return
      setTrafficRoutes(routes)
      const congestion = trafficToKpiValue(routes)
      setState(prev => {
        const sec = prev.sectors['transport' as SectorKey]
        if (!sec) return prev
        const kpis = sec.kpis.map(k =>
          k.id === 'congestion'
            ? { ...k, value: congestion, isLive: true, source: '2GIS Traffic' }
            : k
        )
        return { ...prev, sectors: { ...prev.sectors, transport: { ...sec, kpis } } }
      })
    }
    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── RSS новости → Ollama → Nominatim (каждые 15 мин) ──────────────────────
  useEffect(() => {
    const load = async () => {
      const newsAlerts = await fetchNewsIncidents()
      if (newsAlerts.length === 0) return
      setState(prev => {
        const updated = { ...prev, sectors: { ...prev.sectors } }
        // Сначала чистим все старые news_ алерты во всех секторах
        for (const key of Object.keys(updated.sectors) as SectorKey[]) {
          updated.sectors[key] = {
            ...updated.sectors[key],
            alerts: updated.sectors[key].alerts.filter(a => !a.id.startsWith('news_')),
          }
        }
        // Добавляем новые (до 30 суммарно)
        for (const alert of newsAlerts.slice(0, 30)) {
          const sec = updated.sectors[alert.sector as SectorKey]
          if (!sec) continue
          updated.sectors[alert.sector as SectorKey] = {
            ...sec,
            alerts: [alert, ...sec.alerts].slice(0, 35),
          }
        }
        return updated
      })
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── OpenSky авиация (каждые 5 мин) ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const aircraft = await fetchLowAltitudeAircraft()
      if (aircraft.length === 0) return
      const alerts = aircraft.map(aircraftToAlert)
      setState(prev => {
        const sec = prev.sectors['safety' as SectorKey]
        if (!sec) return prev
        const filtered = sec.alerts.filter(a => !a.id.startsWith('opensky_'))
        return {
          ...prev,
          sectors: {
            ...prev.sectors,
            safety: { ...sec, alerts: [...alerts, ...filtered].slice(0, 12) },
          },
        }
      })
    }
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // ── Корреляции + прогнозы + аномалии при изменении данных ──────────────────
  useEffect(() => {
    if (!realData) return
    setCorrelations(runCorrelationEngine(state, realData.weather))

    const preds: PredictionSeries[] = []
    const detectedAnomalies: AnomalyItem[] = []

    for (const sector of Object.values(state.sectors)) {
      for (const kpi of sector.kpis) {
        const hist = sector.history[kpi.id]
        if (!hist) continue

        // Прогнозы
        if (kpi.severity !== 'good') {
          const series = predictKpi(hist, kpi.id, kpi.label, kpi.unit, kpi.threshold)
          if (series?.willExceedThreshold) preds.push(series)
        }

        // Аномалии Z-score
        const anomaly = detectAnomaly(hist, kpi.value)
        if (anomaly?.isAnomaly) {
          detectedAnomalies.push({
            kpiId: kpi.id,
            kpiLabel: kpi.label,
            sectorKey: sector.key,
            sectorLabel: sector.label,
            zScore: anomaly.zScore,
            direction: anomaly.direction,
            currentValue: kpi.value,
            unit: kpi.unit,
          })
        }
      }
    }
    setPredictions(preds.slice(0, 6))
    setAnomalies(detectedAnomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 5))
  }, [state, realData])

  // ── Первичный AI-анализ при загрузке ───────────────────────────────────────
  useEffect(() => { handleAnalyze() }, [])

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

  const currentTime = now.toLocaleTimeString('ru-RU')
  const currentDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#060d1f] grid-bg text-slate-200">
      {!roleSelected && (
        <RoleSelector onSelect={role => {
          sessionStorage.setItem('sc_role', role.id)
          sessionStorage.setItem('sc_role_label', role.label)
          sessionStorage.setItem('sc_role_icon', role.icon ?? '')
          setRoleSelected(true)
          setRoleLabel(role.label)
          setRoleIcon(role.icon ?? '')
          if (role.focus !== 'all') setActiveTab(role.focus)
        }} />
      )}
      <CityHeader
        state={state}
        onRefresh={handleRefreshData}
        currentTime={currentTime}
        currentDate={currentDate}
        weather={realData?.weather}
        dataFetchedAt={realData?.fetchedAt}
        roleLabel={roleLabel || undefined}
        roleIcon={roleIcon || undefined}
      />

      {realData && <LiveDataBar data={realData} />}

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">

        {/* Tabs + controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 text-sm px-4 py-2 rounded-xl border transition-all duration-200 ${activeTab === tab.id
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
              <ChatPanel state={state} provider={aiProvider} ollamaModel={ollamaModel} />
            )}
            {activeTab !== 'map' && activeTab !== 'chat' && (
              <>
                {realData && (activeTab === 'ecology' || activeTab === 'all') && (
                  <EcologyRealPanel
                    airQuality={realData.airQuality}
                    weather={realData.weather}
                    owmAir={owmAir}
                    owmForecast={owmForecast}
                  />
                )}
                <div className={`grid gap-6 ${activeTab === 'all' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                  {visibleSectors.map(sector => (
                    <SectorPanel key={sector.key} sector={sector} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            <ExportButton state={state} analysis={analysis} />
            <AIProviderSelector
              provider={aiProvider}
              ollamaModel={ollamaModel}
              onProviderChange={setAiProvider}
              onModelChange={setOllamaModel}
            />
            <AIAdvisor analysis={analysis} onRefresh={handleAnalyze} provider={aiProvider} />
            {(correlations.length > 0 || anomalies.length > 0) && (
              <CorrelationPanel correlations={correlations} anomalies={anomalies} />
            )}
            {predictions.length > 0 && <PredictionPanel predictions={predictions} />}
            <OverviewRadar state={state} />

            <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">
                  Инциденты
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
          RiseOS · MVP · Алматы · AI-мониторинг в реальном времени
        </footer>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
