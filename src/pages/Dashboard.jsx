import { useState } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfirmDialog from '../components/ConfirmDialog'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function AccountModal({ onClose, onSave, userId, existing }) {
  const [form, setForm] = useState(
    existing
      ? { id: existing.id, name: existing.name, balance: existing.balance.toString() }
      : { name: '', balance: '' }
  )
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name || form.balance === '') return
    setLoading(true)
    const payload = { name: form.name, balance: Number(form.balance), user_id: userId }
    if (form.id) payload.id = form.id
    await onSave(payload)
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{existing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
        <div className="form-row">
          <label className="form-label">Nombre</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ej: Banco Galicia, Efectivo, Mercado Pago" autoFocus />
        </div>
        <div className="form-row">
          <label className="form-label">Saldo actual ($)</label>
          <input type="number" value={form.balance} onChange={e => set('balance', e.target.value)} placeholder="0" />
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={loading || !form.name || form.balance === ''}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ selectedMonth }) {
  const { user, profile } = useAuth()
  const { calcSummary, transactions, loading, upsertAccount, deleteAccount } = useFinances(selectedMonth)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount]     = useState(null)
  const [confirmAccId, setConfirmAccId]          = useState(null)

  const summary    = calcSummary(user?.id)
  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: es })
  const myColor    = profile?.name === 'Yamil' ? 'var(--yamil)' : 'var(--celeste-c)'

  const myIncomes  = (transactions || []).filter(tx => tx.user_id === user?.id && tx.type === 'income')

  async function handleDeleteAccount() { await deleteAccount(confirmAccId); setConfirmAccId(null) }

  if (loading) return <div className="loading">Cargando…</div>
  if (!summary || !summary.me) return <div className="empty-state">No se encontró tu perfil.</div>

  const { me, realTotal } = summary
  const diff = realTotal - me.restante

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Resumen</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'capitalize', fontWeight: 500 }}>
          {monthLabel}
        </span>
      </div>

      {/* Bloque principal — triángulo: ingreso+gasto arriba, restante centrado abajo */}
      <div className="card mb-3" style={{ borderTop: `3px solid ${myColor}` }}>
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div className={`user-dot ${profile?.name?.toLowerCase()}`} />
          <span style={{ fontWeight: 700, color: myColor, fontSize: '0.95rem' }}>{profile?.name}</span>
        </div>

        {/* Fila superior: Ingreso + Gasto */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="stat-label">Ingreso</div>
            <div className="stat-value positive">{fmt(me.totalIncome)}</div>
          </div>
          <div style={{ width: 1, background: 'var(--border-soft)', margin: '0.25rem 0' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div className="stat-label">Gasto</div>
            <div className="stat-value negative">{fmt(me.totalExpense)}</div>
          </div>
        </div>

        {/* Separador */}
        <div style={{ borderTop: '1px solid var(--border-soft)', margin: '0 -0.25rem 1rem' }} />

        {/* Restante centrado y más grande */}
        <div style={{ textAlign: 'center' }}>
          <div className="stat-label">Restante</div>
          <div className={`stat-value ${me.restante >= 0 ? 'accent' : 'negative'}`}
            style={{ fontSize: '2rem', fontWeight: 800 }}>
            {fmt(me.restante)}
          </div>
        </div>
      </div>

      {/* Desktop: dos columnas — dinero real | ingresos del mes
          Mobile: apilados verticalmente */}
      <div className="dashboard-bottom-grid">

        {/* Columna izquierda: Mi dinero real */}
        <div className="card">
          <div className="section-title">
            <span>Mi dinero real</span>
            <button className="btn btn-soft"
              style={{ fontSize: '0.72rem', padding: '0.22rem 0.65rem' }}
              onClick={() => { setEditingAccount(null); setShowAccountModal(true) }}>
              + Agregar
            </button>
          </div>

          {summary.myAccounts.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
              Cargá tus cuentas para comparar con el Restante calculado.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
              {summary.myAccounts.map(acc => (
                <div key={acc.id} className="account-entity">
                  <span className="account-entity-name">{acc.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="account-entity-value">{fmt(acc.balance)}</span>
                    <button className="btn btn-ghost" title="Editar"
                      onClick={() => { setEditingAccount(acc); setShowAccountModal(true) }}>✎</button>
                    <button className="btn btn-danger" title="Eliminar"
                      onClick={() => setConfirmAccId(acc.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary.myAccounts.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: '0.85rem', borderTop: '1px solid var(--border-soft)',
            }}>
              <div>
                <div className="stat-label" style={{ marginBottom: '0.2rem' }}>Total real</div>
                <div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmt(realTotal)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-label" style={{ marginBottom: '0.2rem' }}>Diferencia</div>
                <div style={{
                  fontSize: '1rem', fontWeight: 700,
                  color: Math.abs(diff) < 1 ? 'var(--green)' : 'var(--red)',
                }}>
                  {Math.abs(diff) < 1 ? '✓ Cuadra' : `${diff > 0 ? '+' : ''}${fmt(diff)}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: Ingresos del mes */}
        <div className="card">
          <div className="section-title">Ingresos del mes</div>
          {myIncomes.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
              No hay ingresos registrados este mes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {myIncomes.map(tx => (
                <div key={tx.id} className="account-entity">
                  <span className="account-entity-name">
                    {tx.description || tx.category || '—'}
                  </span>
                  <span className="account-entity-value" style={{ color: 'var(--green)' }}>
                    +{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {myIncomes.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              paddingTop: '0.85rem', borderTop: '1px solid var(--border-soft)', marginTop: '1rem',
            }}>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-label" style={{ marginBottom: '0.2rem' }}>Total ingresos</div>
                <div className="stat-value positive" style={{ fontSize: '1.3rem' }}>
                  +{fmt(myIncomes.reduce((s, t) => s + Number(t.amount), 0))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {showAccountModal && (
        <AccountModal
          onClose={() => setShowAccountModal(false)}
          onSave={upsertAccount}
          userId={user?.id}
          existing={editingAccount}
        />
      )}
      {confirmAccId && (
        <ConfirmDialog
          title="Eliminar cuenta"
          message="Se elimina la cuenta y su saldo."
          onConfirm={handleDeleteAccount}
          onCancel={() => setConfirmAccId(null)}
        />
      )}
    </div>
  )
}
