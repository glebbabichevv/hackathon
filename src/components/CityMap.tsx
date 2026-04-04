import { useEffect, useRef, useState, useCallback } from 'react'
import { load } from '@2gis/mapgl'
import Anthropic from '@anthropic-ai/sdk'
import type { Alert, Severity } from '../types/city'

const TWOGIS_KEY = import.meta.env.VITE_2GIS_KEY as string
const ALMATY_CENTER: [number, number] = [76.8512, 43.2220] // [lng, lat] — центр Алматы
const FARABI_HUB: [number, number] = [76.9235, 43.2172] // Farabi Hub, пр. Аль-Фараби, 71

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

const severityColor: Record<Severity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  normal: '#60a5fa',
  good: '#34d399',
}

const sectorLabel: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  safety: 'Безопасность',
  utilities: 'ЖКХ',
}

const sectorIcon: Record<string, string> = {
  transport: 'T',
  ecology: 'E',
  safety: 'S',
  utilities: 'U',
}

// Алматы bbox — инциденты вне этого диапазона не показываем на карте
const ALMATY_BOUNDS = { minLng: 76.5, maxLng: 77.4, minLat: 43.0, maxLat: 43.6 }


function inAlmaty(lat: number, lng: number) {
  return lat >= ALMATY_BOUNDS.minLat && lat <= ALMATY_BOUNDS.maxLat &&
    lng >= ALMATY_BOUNDS.minLng && lng <= ALMATY_BOUNDS.maxLng
}

function makeMarkerHtml(color: string, icon: string, isNew: boolean) {
  const pulse = isNew ? `box-shadow:0 0 0 0 ${color}80;animation:pulse-ring 1.5s ease-out infinite;` : ''
  return `<div style="
    width:28px;height:28px;border-radius:50%;
    background:${color}cc;border:2px solid ${color};
    display:flex;align-items:center;justify-content:center;
    font-size:13px;cursor:pointer;
    box-shadow:0 2px 8px ${color}60;
    ${pulse}
  ">${icon}</div>`
}

interface PopupState {
  alert: Alert
  aiText: string
  aiLoading: boolean
  routeActive: boolean
}

interface Props {
  alerts: Alert[]
  newAlertIds: Set<string>
}

export function CityMap({ alerts, newAlertIds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapglApiRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const directionsRef = useRef<any>(null)
  const [trafficOn, setTrafficOn] = useState(true)
  const [routeMode, setRouteMode] = useState(false)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ name: string; lng: number; lat: number }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchMarkerRef = useRef<any>(null)

  const alertsOnMap = alerts.filter(
    a => a.lat != null && a.lng != null && inAlmaty(a.lat!, a.lng!)
  )
  const remoteAlerts = alerts.filter(
    a => a.lat != null && a.lng != null && !inAlmaty(a.lat!, a.lng!)
  )
  const criticalCount = alertsOnMap.filter(a => a.severity === 'critical').length
  const warningCount  = alertsOnMap.filter(a => a.severity === 'warning').length

  // ── Инициализация карты ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let destroyed = false

    load().then(mapgl => {
      if (destroyed || !containerRef.current) return
      mapglApiRef.current = mapgl

      const map = new mapgl.Map(containerRef.current, {
        center: ALMATY_CENTER,
        zoom: 12,
        key: TWOGIS_KEY,
        trafficControl: true,
        trafficOn: true,
        zoomControl: false,
      })

      mapRef.current = map

      map.on('styleload', async () => {
        try {
          const mod = await import('@2gis/mapgl-directions')
          const DirectionsCtor = (mod as any).Directions ?? (mod as any).default?.Directions
          if (DirectionsCtor) {
            directionsRef.current = new DirectionsCtor(map, { directionsApiKey: TWOGIS_KEY })
          }
        } catch { /* ignore */ }
      })
    })

    return () => {
      destroyed = true
      if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null }
    }
  }, [])

  // ── Синхронизация маркеров ────────────────────────────────────────────────
  useEffect(() => {
    const mapgl = mapglApiRef.current
    const map = mapRef.current
    if (!mapgl || !map) return

    const incoming = new Set(alertsOnMap.map(a => a.id))
    const existing = markersRef.current

    // Удаляем старые
    for (const [id, marker] of existing) {
      if (!incoming.has(id)) { marker.destroy(); existing.delete(id) }
    }

    // Добавляем новые
    for (const alert of alertsOnMap) {
      if (existing.has(alert.id)) continue
      const color = severityColor[alert.severity]
      const icon  = sectorIcon[alert.sector] ?? '⚠️'
      const isNew = newAlertIds.has(alert.id)

      const marker = new mapgl.HtmlMarker(map, {
        coordinates: [alert.lng!, alert.lat!], // 2GIS: [lng, lat]
        html: makeMarkerHtml(color, icon, isNew),
        size: [28, 28],
        anchor: [14, 14],
      })

      marker.getContent().addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        const projected = map.project([alert.lng!, alert.lat!])
        setPopupPos({ x: projected[0], y: projected[1] })
        setPopup({ alert, aiText: '', aiLoading: false, routeActive: false })
      })

      existing.set(alert.id, marker)
    }
  }, [alertsOnMap, newAlertIds])

  // ── Переключение пробок ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    try {
      trafficOn ? mapRef.current.showTraffic() : mapRef.current.hideTraffic()
    } catch { /* ignore */ }
  }, [trafficOn])

  // ── Клик по карте: маршрут-режим или закрыть попап ────────────────────────
  const routeModeRef = useRef(false)
  routeModeRef.current = routeMode

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleMapClick = (e: any) => {
      if (routeModeRef.current && directionsRef.current) {
        const [lng, lat] = e.lngLat ?? map.unproject([e.point?.x ?? 0, e.point?.y ?? 0])
        directionsRef.current.carRoute({ points: [FARABI_HUB, [lng, lat]] })
        setRouteMode(false)
      } else {
        setPopup(null)
      }
    }

    map.on('click', handleMapClick)
    return () => map.off('click', handleMapClick)
  }, [mapRef.current])

  // ── Claude-анализ инцидента ────────────────────────────────────────────────
  const analyzeWithClaude = useCallback(async (alert: Alert) => {
    setPopup(prev => prev ? { ...prev, aiLoading: true } : null)
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'Ты — аналитик системы умного города Алматы. Отвечай СТРОГО на русском языке, без единого английского слова. Давай краткий конкретный анализ в 2-3 предложения.',
        messages: [{
          role: 'user',
          content: `Инцидент: ${alert.title}\n${alert.description}\nМесто: ${alert.location ?? 'неизвестно'}\nВремя: ${alert.timestamp}\n\nКраткий анализ и приоритет действий:`
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      setPopup(prev => prev ? { ...prev, aiText: text, aiLoading: false } : null)
    } catch {
      setPopup(prev => prev ? { ...prev, aiText: 'Анализ недоступен', aiLoading: false } : null)
    }
  }, [])

  // ── Маршрут к инциденту через 2GIS Directions ─────────────────────────────
  const buildRoute = useCallback((alert: Alert) => {
    const d = directionsRef.current
    if (!d || !alert.lat || !alert.lng) return
    try {
      d.carRoute({ points: [FARABI_HUB, [alert.lng!, alert.lat!]] })
      setPopup(prev => prev ? { ...prev, routeActive: true } : null)
    } catch { /* ignore */ }
  }, [])

  const clearRoute = useCallback(() => {
    directionsRef.current?.clear?.()
    setPopup(prev => prev ? { ...prev, routeActive: false } : null)
  }, [])

  // ── Поиск адреса через 2GIS Geocoding API ────────────────────────────────
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q)
    setSearchResults([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 3) return
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(q + ', Алматы')}&fields=items.point&key=${TWOGIS_KEY}&page_size=5`,
          { signal: AbortSignal.timeout(4000) }
        )
        const data = await res.json()
        const items = (data.result?.items ?? []) as any[]
        setSearchResults(items
          .filter((i: any) => i.point)
          .map((i: any) => ({
            name: i.full_name ?? i.name ?? q,
            lng: i.point.lon,
            lat: i.point.lat,
          }))
        )
      } catch { /* ignore */ }
      finally { setSearchLoading(false) }
    }, 400)
  }, [])

  const selectSearchResult = useCallback((item: { name: string; lng: number; lat: number }) => {
    const map = mapRef.current
    const mapgl = mapglApiRef.current
    if (!map || !mapgl) return

    // Центрировать карту
    map.setCenter([item.lng, item.lat], { animate: true })
    map.setZoom(16, { animate: true })

    // Убрать старый маркер поиска
    if (searchMarkerRef.current) { searchMarkerRef.current.destroy(); searchMarkerRef.current = null }

    // Поставить маркер
    searchMarkerRef.current = new mapgl.HtmlMarker(map, {
      coordinates: [item.lng, item.lat],
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:#6366f1cc;border:2px solid #818cf8;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;box-shadow:0 2px 12px #6366f180;
      ">📍</div>`,
      size: [32, 32],
      anchor: [16, 32],
    })

    setSearchQuery(item.name)
    setSearchResults([])
  }, [])

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a3050]">
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          <div>
            <h2 className="text-sm font-bold text-white">Карта инцидентов</h2>
            <p className="text-[11px] text-slate-500">Алматы · 2GIS · реальное время</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTrafficOn(v => !v)}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              trafficOn
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'border-[#1a3050] text-slate-500 hover:border-slate-500'
            }`}
          >
            🚦 Пробки
          </button>
          <button
            onClick={() => { setRouteMode(v => !v); setPopup(null) }}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              routeMode
                ? 'bg-violet-500/20 border-violet-400/60 text-violet-300 animate-pulse'
                : 'border-[#1a3050] text-slate-500 hover:border-slate-500'
            }`}
          >
            {routeMode ? '📍 Кликни на карту' : '🗺 Маршрут'}
          </button>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/40 rounded-full px-2.5 py-0.5 text-xs font-bold text-red-400">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {criticalCount} крит.
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/40 rounded-full px-2.5 py-0.5 text-xs font-bold text-yellow-400">
              {warningCount} пред.
            </span>
          )}
          {remoteAlerts.length > 0 && (
            <span className="flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/40 rounded-full px-2.5 py-0.5 text-xs font-bold text-purple-400">
              🌍 {remoteAlerts.length} удал.
            </span>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', padding: '8px 12px', borderBottom: '1px solid #1a3050' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 10, fontSize: 14, color: '#475569' }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearchResults([])}
            placeholder="Поиск адреса в Алматы..."
            style={{
              width: '100%',
              background: '#0a1e38',
              border: '1px solid #1a3050',
              borderRadius: 8,
              padding: '7px 32px 7px 32px',
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
            }}
          />
          {searchLoading && (
            <span style={{ position: 'absolute', right: 10, fontSize: 12, color: '#475569' }}>...</span>
          )}
          {searchQuery && !searchLoading && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]) }}
              style={{ position: 'absolute', right: 10, color: '#475569', fontSize: 14, cursor: 'pointer' }}
            >×</button>
          )}
        </div>
        {searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 12, right: 12, zIndex: 9999,
            background: '#0f1f35',
            border: '1px solid #1a3050',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => selectSearchResult(r)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  borderBottom: i < searchResults.length - 1 ? '1px solid #1a3050' : 'none',
                  background: 'transparent',
                  display: 'block',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a3050')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                📍 {r.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container */}
      <div style={{ height: 420, position: 'relative' }}>
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

        {/* Incident popup */}
        {popup && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(popupPos.x, (containerRef.current?.clientWidth ?? 400) - 290),
              top: Math.max(popupPos.y - 260, 8),
              zIndex: 9999,
              width: 280,
              background: '#0f1f35',
              border: `1px solid ${severityColor[popup.alert.severity]}50`,
              borderRadius: 12,
              padding: '12px 14px',
              color: '#e2e8f0',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${severityColor[popup.alert.severity]}20`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                background: severityColor[popup.alert.severity],
                boxShadow: `0 0 6px ${severityColor[popup.alert.severity]}`,
              }} />
              <strong style={{ fontSize: 13, lineHeight: 1.3, color: '#fff' }}>
                {popup.alert.title}
              </strong>
              <button
                onClick={() => { clearRoute(); setPopup(null) }}
                style={{ marginLeft: 'auto', color: '#475569', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
              >×</button>
            </div>

            <p style={{ fontSize: 12, margin: '0 0 6px', color: '#94a3b8', lineHeight: 1.5 }}>
              {popup.alert.description}
            </p>

            {popup.alert.location && (
              <p style={{ fontSize: 11, margin: '0 0 6px', color: '#64748b' }}>
                📍 {popup.alert.location}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>
                {sectorIcon[popup.alert.sector]} {sectorLabel[popup.alert.sector]}
              </span>
              <span style={{ fontSize: 10, color: '#475569' }}>{popup.alert.timestamp}</span>
            </div>

            {popup.alert.source && (
              <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 8 }}>
                📡 {popup.alert.source}
              </div>
            )}

            {/* AI Analysis */}
            {popup.aiText && (
              <div style={{
                background: '#1e3a5f',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 11,
                color: '#bfdbfe',
                lineHeight: 1.5,
                marginBottom: 8,
              }}>
                {popup.aiText}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                onClick={() => analyzeWithClaude(popup.alert)}
                disabled={popup.aiLoading}
                style={{
                  flex: 1,
                  background: popup.aiLoading ? '#1e3a5f' : '#1d4ed8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 11,
                  cursor: popup.aiLoading ? 'default' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {popup.aiLoading ? 'Анализ...' : 'AI анализ'}
              </button>
              <button
                onClick={() => popup.routeActive ? clearRoute() : buildRoute(popup.alert)}
                style={{
                  flex: 1,
                  background: popup.routeActive ? '#7c3aed' : '#0f4c8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {popup.routeActive ? '✕ Маршрут' : '🗺 Маршрут'}
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
          background: 'rgba(6,13,31,0.92)',
          border: '1px solid #1a3050',
          borderRadius: 10,
          padding: '7px 12px',
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {([['critical', '#ef4444', 'Критично'], ['warning', '#f59e0b', 'Внимание'], ['normal', '#60a5fa', 'Инфо']] as const).map(([, color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: 10, color: '#475569' }}>|</span>
          <span style={{ fontSize: 10, color: '#60a5fa' }}>{alertsOnMap.length} на карте</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
          70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  )
}
