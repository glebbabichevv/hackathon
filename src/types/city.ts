export type Severity = 'critical' | 'warning' | 'normal' | 'good'

export interface KPI {
  id: string
  label: string
  value: number
  unit: string
  trend: number // % change vs prev period
  threshold: { warning: number; critical: number }
  severity: Severity
  description: string
  isLive?: boolean    // данные из реального API
  source?: string     // название источника данных
}

export interface TimePoint {
  time: string
  value: number
}

export interface Alert {
  id: string
  sector: SectorKey
  title: string
  description: string
  severity: Severity
  timestamp: string
  location?: string
  actionRequired: string
  lat?: number
  lng?: number
  isGenerated?: boolean
  source?: string
}

export type SectorKey = 'transport' | 'ecology' | 'safety' | 'utilities'

export interface Sector {
  key: SectorKey
  label: string
  icon: string
  color: string
  kpis: KPI[]
  history: Record<string, TimePoint[]>
  alerts: Alert[]
}

export interface CityState {
  timestamp: string
  city: string
  overallScore: number
  overallSeverity: Severity
  sectors: Record<SectorKey, Sector>
}

export interface AIAnalysis {
  summary: string
  whatHappening: string
  howCritical: string
  whatToDo: string
  predictions: string[]
  loading: boolean
  error?: string
}
