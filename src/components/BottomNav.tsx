import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Bugün', icon: '📋' },
  { to: '/plan', label: 'Plan', icon: '🤖' },
  { to: '/konular', label: 'Konu', icon: '📚' },
  { to: '/test', label: 'Test', icon: '✏️' },
  { to: '/rapor', label: 'Rapor', icon: '📊' },
  { to: '/profil', label: 'Profil', icon: '👤' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary-700 bg-primary-50' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
