const ROLES = [
  { id: 'akim',      label: 'Аким города',           labelKz: 'Қала әкімі',          icon: '🏛️', focus: 'all' },
  { id: 'transport', label: 'Нач. транспорта',        labelKz: 'Көлік басшысы',       icon: '🚗', focus: 'transport' },
  { id: 'ecology',   label: 'Нач. экологии',          labelKz: 'Экология басшысы',    icon: '🌿', focus: 'ecology' },
  { id: 'utilities', label: 'Нач. ЖКХ',               labelKz: 'ТКШ басшысы',         icon: '⚙️', focus: 'utilities' },
  { id: 'safety',    label: 'Нач. безопасности',      labelKz: 'Қауіпсіздік басшысы', icon: '🛡️', focus: 'safety' },
]

interface Props {
  onSelect: (role: { id: string; focus: string; label: string }) => void
}

export function RoleSelector({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#030810]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-black text-white">
              SC
            </div>
            <div className="text-left">
              <p className="text-xl font-bold text-white">Smart City Dashboard</p>
              <p className="text-sm text-slate-400">Алматы · Панель управленческих решений</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Выберите вашу роль для персонализированного дашборда</p>
          <p className="text-slate-600 text-xs mt-1">Таңдаңыз рөліңізді / Select your role</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 gap-3">
          {ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => onSelect(role)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[#1a3050] bg-[#0a1628] hover:border-cyan-400/50 hover:bg-cyan-400/5 transition-all duration-200 text-left group"
            >
              <span className="text-3xl">{role.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {role.label}
                </p>
                <p className="text-[11px] text-slate-500">{role.labelKz}</p>
              </div>
              <span className="text-slate-600 group-hover:text-cyan-400 transition-colors text-xl">→</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">
          Данные обновляются в реальном времени · Open-Meteo · USGS · RSS
        </p>
      </div>
    </div>
  )
}
