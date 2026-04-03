export interface Prediction {
  label: string
  value: number
  confidence: number   // 0–100%
  trend: 'rising' | 'falling' | 'stable'
  riskLevel: 'critical' | 'warning' | 'normal'
}

export interface PredictionSeries {
  kpiId: string
  kpiLabel: string
  unit: string
  current: number
  predictions: Prediction[]
  willExceedThreshold: boolean
  thresholdValue: number
  estimatedTimeToThreshold: string | null
}

function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length
  const x = values.map((_, i) => i)
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const yMean = sumY / n
  const ssTot = values.reduce((acc, y) => acc + (y - yMean) ** 2, 0)
  const ssRes = values.reduce((acc, y, i) => acc + (y - (intercept + slope * i)) ** 2, 0)
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0

  return { slope, intercept, r2 }
}

export function predictKpi(
  history: { time: string; value: number }[],
  kpiId: string,
  kpiLabel: string,
  unit: string,
  thresholds: { warning: number; critical: number },
  horizons = [1, 2, 4]
): PredictionSeries | null {
  if (history.length < 5) return null

  const values = history.map(h => h.value)
  const current = values[values.length - 1]
  const { slope, intercept, r2 } = linearRegression(values)
  const pointsPerHour = 2

  const predictions: Prediction[] = horizons.map(hours => {
    const futureIdx = values.length + hours * pointsPerHour
    const raw = intercept + slope * futureIdx
    const predicted = Math.round(Math.max(0, Math.min(200, raw)) * 10) / 10
    const confidence = Math.round(Math.max(20, r2 * 100 - hours * 8))

    return {
      label: hours === 1 ? 'через 1 ч' : `через ${hours} ч`,
      value: predicted,
      confidence,
      trend: slope > 0.3 ? 'rising' : slope < -0.3 ? 'falling' : 'stable',
      riskLevel: predicted >= thresholds.critical ? 'critical'
        : predicted >= thresholds.warning ? 'warning' : 'normal',
    }
  })

  let estimatedTimeToThreshold: string | null = null
  if (slope > 0 && current < thresholds.critical) {
    const stepsToThreshold = (thresholds.critical - current) / (slope || 0.001)
    const hours = stepsToThreshold / pointsPerHour
    if (hours > 0 && hours < 24) {
      estimatedTimeToThreshold = hours < 1 ? '< 1 ч' : `~${Math.round(hours)} ч`
    }
  }

  return {
    kpiId,
    kpiLabel,
    unit,
    current,
    predictions,
    willExceedThreshold: predictions.some(p => p.riskLevel !== 'normal'),
    thresholdValue: thresholds.warning,
    estimatedTimeToThreshold,
  }
}
