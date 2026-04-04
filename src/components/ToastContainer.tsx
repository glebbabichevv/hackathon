import { useEffect, useState } from 'react'
import type { Alert } from '../types/city'

export interface Toast {
  id: string
  alert: Alert
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

const severityStyle = {
  critical: { bar: 'bg-red-500', border: 'border-red-500/50', badge: 'bg-red-500 text-white', label: 'КРИТИЧНО' },
  warning: { bar: 'bg-yellow-400', border: 'border-yellow-400/50', badge: 'bg-yellow-400 text-black', label: 'ВНИМАНИЕ' },
  normal: { bar: 'bg-blue-400', border: 'border-blue-400/40', badge: 'bg-blue-400/30 text-blue-200', label: 'ИНФО' },
  good: { bar: 'bg-green-400', border: 'border-green-400/40', badge: 'bg-green-400/30 text-green-200', label: 'OK' },
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const s = severityStyle[toast.alert.severity]

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 20)
    // Start leaving at 4.5s
    const t2 = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onRemove(toast.id), 400)
    }, 4500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.id, onRemove])

  return (
    <div
      onClick={() => { setLeaving(true); setTimeout(() => onRemove(toast.id), 400) }}
      style={{
        transform: visible && !leaving ? 'translateX(0)' : 'translateX(110%)',
        opacity: leaving ? 0 : 1,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      }}
      className={`cursor-pointer w-80 rounded-xl border ${s.border} bg-[#0a1628] shadow-2xl overflow-hidden`}
    >
      {/* progress bar */}
      <div
        className={`h-0.5 ${s.bar}`}
        style={{ animation: 'toast-shrink 4.5s linear forwards' }}
      />
      <div className="p-4 flex gap-3">
        <div className="flex-shrink-0 text-xl">{sectorIcon[toast.alert.sector]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>{s.label}</span>
            <span className="text-[10px] text-slate-500">{sectorLabel[toast.alert.sector]} · {toast.alert.timestamp}</span>
          </div>
          <p className="text-sm font-semibold text-white leading-tight truncate">{toast.alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{toast.alert.description}</p>
        </div>
        <button className="flex-shrink-0 text-slate-600 hover:text-slate-400 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

interface Props {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999]"
      style={{ pointerEvents: toasts.length ? 'auto' : 'none' }}
    >
      <style>{`
        @keyframes toast-shrink {
          from { width: 100% }
          to { width: 0% }
        }
      `}</style>
      {toasts.slice(-4).map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
