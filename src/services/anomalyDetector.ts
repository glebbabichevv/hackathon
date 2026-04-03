export interface AnomalyResult {
  isAnomaly: boolean
  zScore: number
  mean: number
  std: number
  direction: 'up' | 'down' | 'stable'
  confidence: 'high' | 'medium' | 'low'
}

export function detectAnomaly(
  history: { time: string; value: number }[],
  currentValue: number
): AnomalyResult | null {
  if (history.length < 6) return null

  const values = history.map(h => h.value)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.map(v => (v - mean) ** 2).reduce((a, b) => a + b) / values.length
  const std = Math.sqrt(variance)

  if (std === 0) return null

  const zScore = Math.abs((currentValue - mean) / std)
  const direction: AnomalyResult['direction'] =
    currentValue > mean + std ? 'up' :
    currentValue < mean - std ? 'down' : 'stable'

  return {
    isAnomaly: zScore > 2.0,
    zScore: Math.round(zScore * 100) / 100,
    mean: Math.round(mean * 10) / 10,
    std: Math.round(std * 10) / 10,
    direction,
    confidence: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low',
  }
}

// IQR метод — устойчив к выбросам
export function detectAnomalyIQR(
  history: { time: string; value: number }[],
  currentValue: number
): boolean {
  if (history.length < 8) return false
  const sorted = [...history.map(h => h.value)].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return currentValue < q1 - 1.5 * iqr || currentValue > q3 + 1.5 * iqr
}
