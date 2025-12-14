'use client'

import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({ enabled, onChange, disabled = false, className }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={cn(
        'relative inline-flex h-7 w-[52px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
        enabled ? 'bg-green-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ direction: 'ltr' }}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition-all duration-300 ease-in-out',
          'absolute top-[2px]',
          enabled ? 'left-[24px]' : 'left-[2px]'
        )}
      />
    </button>
  )
}

interface ToggleSettingProps {
  icon: string
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function ToggleSetting({ icon, title, description, enabled, onChange, disabled = false }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
    </div>
  )
}
