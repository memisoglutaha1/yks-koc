import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Layout({ title, subtitle, action, children }: LayoutProps) {
  const location = useLocation()
  const { viewingStudent } = useAuth()
  const showSettings = !['/ayarlar', '/profil'].includes(location.pathname)
  const stickyTop = viewingStudent ? 'top-[41px]' : 'top-0'

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-slate-50 pb-24">
      <header className={`sticky ${stickyTop} z-40 border-b border-slate-200 bg-primary-800 px-4 py-4 text-white shadow-md`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-sm text-blue-100">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {showSettings && (
              <Link
                to="/ayarlar"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg active:bg-white/30"
                title="Ayarlar"
              >
                ⚙️
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
  )
}

export function Badge({ children, color = 'bg-slate-100 text-slate-700' }: { children: ReactNode; color?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{children}</span>
}

export function ProgressBar({ value, max = 100, color = 'bg-primary-600' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-4xl">{icon}</p>
      <p className="mt-3 font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}) {
  const variants = {
    primary: 'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-800',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        {...props}
      />
    </label>
  )
}

export function PasswordInput({
  label,
  value,
  onChange,
  ...props
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'>) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          {...props}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          tabIndex={-1}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </div>
    </label>
  )
}

export function Select({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
