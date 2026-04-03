import type { Alert } from '../types/city'

// OpenSky Network — бесплатно, без ключа
// Воздушные суда над Алматы на малой высоте
const BBOX = { lamin: 43.0, lomin: 76.5, lamax: 43.6, lomax: 77.4 }

export interface AircraftState {
  icao24: string
  callsign: string
  lat: number
  lng: number
  altitudeM: number       // высота в метрах (geo)
  velocityMs: number      // скорость м/с
  onGround: boolean
  lastContact: number
}

export async function fetchLowAltitudeAircraft(): Promise<AircraftState[]> {
  try {
    const url =
      `https://opensky-network.org/api/states/all` +
      `?lamin=${BBOX.lamin}&lomin=${BBOX.lomin}&lamax=${BBOX.lamax}&lomax=${BBOX.lomax}`

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    if (!data?.states) return []

    return (data.states as any[])
      .map((s: any[]) => ({
        icao24:      s[0] ?? '',
        callsign:    (s[1] ?? '').trim(),
        lat:         s[6] ?? 0,
        lng:         s[5] ?? 0,
        altitudeM:   s[13] ?? s[7] ?? 9999,   // geo alt, fallback baro alt
        velocityMs:  s[9] ?? 0,
        onGround:    s[8] ?? false,
        lastContact: s[4] ?? 0,
      }))
      .filter(a => !a.onGround && a.lat && a.lng && a.altitudeM < 1500)
  } catch {
    return []
  }
}

export function aircraftToAlert(ac: AircraftState): Alert {
  const isVeryLow = ac.altitudeM < 500
  const severity = isVeryLow ? 'warning' : 'normal'
  const altFt = Math.round(ac.altitudeM * 3.28)
  const speedKmh = Math.round(ac.velocityMs * 3.6)

  return {
    id: `opensky_${ac.icao24}`,
    sector: 'safety',
    title: `${isVeryLow ? '🚁 Вертолёт' : '✈️ ВС'} на малой высоте${ac.callsign ? ` — ${ac.callsign}` : ''}`,
    description:
      `Воздушное судно на высоте ${ac.altitudeM}м (${altFt} ft), скорость ${speedKmh} км/ч.` +
      (isVeryLow ? ' Очень малая высота — возможна спасательная операция.' : ''),
    severity,
    timestamp: new Date(ac.lastContact * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    location: `Над Алматы`,
    actionRequired: isVeryLow
      ? 'Проверить наличие чрезвычайной ситуации. Освободить зону посадки.'
      : 'Наблюдение. Контроль воздушного пространства.',
    lat: ac.lat,
    lng: ac.lng,
    isGenerated: false,
    source: 'OpenSky Network',
  }
}

// Дополнительная информация для карты (цвет отличается от стандартных секторов)
export function isHelicopter(ac: AircraftState): boolean {
  return ac.altitudeM < 500 && ac.velocityMs < 80
}
