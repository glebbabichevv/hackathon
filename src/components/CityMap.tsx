import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Alert, Severity } from '../types/city'
import { useEffect } from 'react'

const severityColor: Record<Severity, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  normal: '#60a5fa',
  good: '#34d399',
}

const severityPulse: Record<Severity, boolean> = {
  critical: true,
  warning: false,
  normal: false,
  good: false,
}

const sectorLabel: Record<string, string> = {
  transport: 'Транспорт',
  ecology: 'Экология',
  safety: 'Безопасность',
  utilities: 'ЖКХ',
}

function FitAlerts({ alerts }: { alerts: Alert[] }) {
  const map = useMap()
  useEffect(() => {
    const pts = alerts.filter(a => a.lat && a.lng)
    if (pts.length === 0) return
    // Just keep center — don't auto-zoom on every render
  }, [])
  return null
}

interface Props {
  alerts: Alert[]
  newAlertIds: Set<string>
}

export function CityMap({ alerts, newAlertIds }: Props) {
  const alertsWithCoords = alerts.filter(a => a.lat != null && a.lng != null)
  const criticalCount = alertsWithCoords.filter(a => a.severity === 'critical').length
  const warningCount = alertsWithCoords.filter(a => a.severity === 'warning').length

  return (
    <div className="rounded-2xl border border-[#1a3050] bg-[#0a1628] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a3050]">
        <div className="flex items-center gap-3">
          <span className="text-xl">🗺️</span>
          <div>
            <h2 className="text-sm font-bold text-white">Карта инцидентов</h2>
            <p className="text-[11px] text-slate-500">Алматы · в реальном времени</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 440, position: 'relative' }}>
        <MapContainer
          center={[43.257, 76.940]}
          zoom={12}
          style={{ height: '100%', width: '100%', background: '#0a1628' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitAlerts alerts={alertsWithCoords} />

          {alertsWithCoords.map(alert => {
            const color = severityColor[alert.severity]
            const isPulse = severityPulse[alert.severity]
            const isNew = newAlertIds.has(alert.id)
            const radius = alert.severity === 'critical' ? 13 : alert.severity === 'warning' ? 10 : 8

            return (
              <CircleMarker
                key={alert.id}
                center={[alert.lat!, alert.lng!]}
                radius={radius}
                pathOptions={{
                  color: isNew ? '#ffffff' : color,
                  fillColor: color,
                  fillOpacity: isPulse ? 0.85 : 0.7,
                  weight: isNew ? 3 : 2,
                }}
              >
                <Popup
                  className="city-popup"
                >
                  <div style={{
                    background: '#0f1f35',
                    border: `1px solid ${color}40`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    minWidth: 220,
                    maxWidth: 280,
                    color: '#e2e8f0',
                    fontFamily: 'system-ui, sans-serif',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: color, flexShrink: 0,
                        boxShadow: `0 0 6px ${color}`,
                      }} />
                      <strong style={{ fontSize: 13, lineHeight: 1.3, color: '#fff' }}>
                        {alert.title}
                      </strong>
                    </div>
                    <p style={{ fontSize: 12, margin: '0 0 8px', color: '#94a3b8', lineHeight: 1.5 }}>
                      {alert.description}
                    </p>
                    {alert.location && (
                      <p style={{ fontSize: 11, margin: '0 0 8px', color: '#64748b' }}>
                        📍 {alert.location}
                      </p>
                    )}
                    <div style={{
                      background: '#ffffff10',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 11,
                      color: '#cbd5e1',
                    }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>→ </span>
                      {alert.actionRequired}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>
                        {sectorLabel[alert.sector]}
                      </span>
                      <span style={{ fontSize: 10, color: '#475569' }}>{alert.timestamp}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
          background: 'rgba(6,13,31,0.92)',
          border: '1px solid #1a3050',
          borderRadius: 10,
          padding: '8px 12px',
          display: 'flex', gap: 14,
        }}>
          {([['critical', '#ef4444', 'Критично'], ['warning', '#f59e0b', 'Внимание'], ['normal', '#60a5fa', 'Инфо']] as const).map(([, color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
