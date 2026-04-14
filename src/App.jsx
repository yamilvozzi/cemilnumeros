import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FixedExpenses from './pages/FixedExpenses'
import Transactions from './pages/Transactions'
import Shared from './pages/Shared'
import { addMonths, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'

const NavIcons = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  fixed: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  transactions: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  shared: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
}

const PAGES = [
  { id: 'dashboard',    label: 'Resumen',   icon: NavIcons.dashboard    },
  { id: 'fixed',        label: 'Fijos',     icon: NavIcons.fixed        },
  { id: 'transactions', label: 'Gastos',    icon: NavIcons.transactions },
  { id: 'shared',       label: 'Compartidos', icon: NavIcons.shared     },
]

function MonthSelector({ month, onChange }) {
  return (
    <div className="month-selector">
      <button className="btn btn-ghost" onClick={() => onChange(subMonths(month, 1))} style={{ padding: '0.1rem 0.4rem' }}>‹</button>
      <span>{format(month, 'MMMM yyyy', { locale: es })}</span>
      <button className="btn btn-ghost" onClick={() => onChange(addMonths(month, 1))} style={{ padding: '0.1rem 0.4rem' }}>›</button>
    </div>
  )
}

function AppShell({ children, currentPage, setPage, profile, signOut, month, setMonth }) {
  const nameColor = profile?.name === 'Yamil' ? 'var(--yamil)' : 'var(--celeste-c)'

  return (
    <div className="app-layout">

      {/* ── DESKTOP: sidebar lateral ── */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-main">TecaCemil</div>
          <div className="sidebar-logo-sub">hagamos números</div>
        </div>
        <ul className="nav-list">
          {PAGES.map(p => (
            <li key={p.id} className="nav-item">
              <button className={currentPage === p.id ? 'active' : ''} onClick={() => setPage(p.id)}>
                <span className="nav-icon">{p.icon}</span>
                {p.label === 'Fijos' ? 'Gastos Fijos' : p.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="sidebar-user-pill">
            <div className={`user-dot ${profile?.name?.toLowerCase()}`} />
            <span className="sidebar-user-name" style={{ color: nameColor }}>{profile?.name}</span>
          </div>
          <button className="btn-signout" onClick={signOut}>Cerrar sesión</button>
        </div>
      </nav>

      {/* ── MÓVIL: barra superior (usuario + mes) ── */}
      <div className="mobile-top-bar">
        <div className="mobile-top-bar-user">
          <div className={`user-dot ${profile?.name?.toLowerCase()}`} />
          <span style={{ color: nameColor }}>{profile?.name}</span>
        </div>
        <div className="mobile-top-bar-right">
          <MonthSelector month={month} onChange={setMonth} />
          <button className="btn-signout" onClick={signOut} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
            Salir
          </button>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="main-content">
        {/* Selector de mes solo en desktop */}
        <div className="desktop-month-selector" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <MonthSelector month={month} onChange={setMonth} />
        </div>
        {children}
      </main>

      {/* ── MÓVIL: navegación inferior ── */}
      <nav className="mobile-bottom-nav">
        {PAGES.map(p => (
          <button
            key={p.id}
            className={currentPage === p.id ? 'active' : ''}
            onClick={() => setPage(p.id)}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </nav>

      {/* Elemento legacy — oculto por CSS en ambos breakpoints */}
      <div className="mobile-user-bar" />
    </div>
  )
}

export default function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [page, setPage]   = useState('dashboard')
  const [month, setMonth] = useState(new Date())

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
        Cargando…
      </div>
    )
  }

  if (!user) return <Login />

  const pageProps = { selectedMonth: month }

  return (
    <AppShell currentPage={page} setPage={setPage} profile={profile} signOut={signOut} month={month} setMonth={setMonth}>
      {page === 'dashboard'    && <Dashboard     {...pageProps} />}
      {page === 'fixed'        && <FixedExpenses {...pageProps} />}
      {page === 'transactions' && <Transactions  {...pageProps} />}
      {page === 'shared'       && <Shared        {...pageProps} />}
    </AppShell>
  )
}
