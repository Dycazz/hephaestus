'use client'

import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { Toast } from '@/types'

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
}

const styles = {
  success: 'bg-green-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
  error: 'bg-red-600 text-white',
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl ${styles[toast.type]} animate-in slide-in-from-right`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-xs underline mt-1 opacity-90 hover:opacity-100"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
