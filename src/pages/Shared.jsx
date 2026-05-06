import { useState } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfirmDialog from '../components/ConfirmDialog'


function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function IconArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function IconOk() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function SettlementModal({ onClose, onSave, userId, profiles, summary }) {
  const today     = format(new Date(), 'yyyy-MM-dd')
  const otherUser = profiles.find(p => p.id !== userId)
  const [form, setForm] = useState({
    to_user_id: otherUser?.id || '',
    amount:     summary?.debtResult ? Math.round(summary.debtResult.amount).toString() : '',
    date:       today,
    note:       '',
  })
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.amount || !form.to_user_id) return
    setLoading(true)
    await onSave({ ...form, amount: Number(form.amount), from_user_id: userId })
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Registrar transferencia</h2>
        <div className="form-row">
          <label className="form-label">Para</label>
          <select value={form.to_user_id} onChange={e => set('to_user_id', e.target.value)}>
            {profiles.filter(p => p.id !== userId).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-grid-2">
          <div className="form-row">
            <label className="form-label">Monto ($)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" autoFocus />
          </div>
          <div className="form-row">
            <label className="form-label">Fecha</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <label className="form-label">Nota (opcional)</label>
          <input type="text" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ej: Saldo quincena" />
        </div>
        {summary?.debtResult && (
          <div style={{ background: 'var(--accent-lite)', border: '1px solid rgba(232,145,42,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Deuda pendiente: <strong style={{ color: 'var(--accent)' }}>{fmt(summary.debtResult.amount)}</strong>
            {' '}({summary.debtResult.from} → {summary.debtResult.to})
          </div>
        )}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || !form.amount}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Shared({ selectedMonth }) {
  const { user } = useAuth()
  const { transactions, settlements, profiles, calcSummary, loading, addSettlement, deleteSettlement } = useFinances(selectedMonth)
  const [showModal, setShowModal] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [filterCard, setFilterCard] = useState('all')

  const summary        = calcSummary(user?.id)

  function cardLabel(pm) {
    if (!pm || pm === 'efectivo' || pm === 'debito' || pm === 'transferencia') return 'Otros'
    if (pm === 'visa' || pm.startsWith('visa_')) return 'VISA'
    if (pm === 'amex' || pm.startsWith('amex_')) return 'AMEX'
    return 'Otros'
  }

  const sharedExpenses = (transactions || [])
    .filter(tx => tx.is_shared && tx.type === 'expense')
    .filter(tx => {
      if (filterCard === 'all') return true
      return cardLabel(tx.payment_method) === filterCard
    })

  async function handleDeleteSettlement() { await deleteSettlement(confirmId); setConfirmId(null) }

  if (!user) return <div className="loading">Cargando usuario…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compartidos</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Transferencia</button>
      </div>

      {/* 1. Resumen */}
      {!loading && summary && (
        <div className="card mb-3">
          <div className="section-title">Gastos compartidos del mes</div>
          <div className="grid-3" style={{ gap: '1.25rem' }}>
            <div>
              <div className="stat-label">Total compartido</div>
              <div className="stat-value accent">{fmt(summary.totalShared)}</div>
            </div>
            <div>
              <div className="stat-label">Parte por persona</div>
              <div className="stat-value">{fmt(summary.splitPerPerson)}</div>
            </div>
            <div>
              <div className="stat-label">Pagó cada uno</div>
              <div style={{ marginTop: '0.3rem' }}>
                {Object.values(summary.users).map(u => (
                  <div key={u.id} style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    <span style={{ color: u.name === 'Yamil' ? 'var(--yamil)' : 'var(--celeste-c)', fontWeight: 600 }}>{u.name}</span>
                    {': '}{fmt(u.sharedPaid)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Transferencias */}
      <div className="mb-3">
        <div className="section-title">Transferencias registradas</div>
        {!loading && settlements.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>Sin transferencias este mes.</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>De</th><th>Para</th>
                    <th className="col-nota">Nota</th>
                    <th style={{ textAlign: 'right' }}>Monto</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map(st => {
                    const fromName = st.from?.profiles?.name || '?'
                    const toName   = st.to?.profiles?.name   || '?'
                    return (
                      <tr key={st.id}>
                        <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {format(new Date(st.date + 'T00:00:00'), 'd MMM', { locale: es })}
                        </td>
                        <td><span className={`tag tag-${fromName.toLowerCase()}`}>{fromName}</span></td>
                        <td><span className={`tag tag-${toName.toLowerCase()}`}>{toName}</span></td>
                        <td className="col-nota" style={{ color: 'var(--text-muted)' }}>{st.note || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(st.amount)}</td>
                        <td>
                          {st.from_user_id === user?.id && (
                            <button className="btn btn-danger" onClick={() => setConfirmId(st.id)}>✕</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Quién debe */}
      {!loading && summary && (
        <div className="mb-3">
          <div className={`debt-callout ${!summary.debtResult ? 'debt-ok' : ''}`}>
            <div style={{ color: summary.debtResult ? 'var(--accent)' : 'var(--green)', flexShrink: 0 }}>
              {summary.debtResult ? <IconArrow /> : <IconOk />}
            </div>
            <div>
              {summary.debtResult ? (
                <>
                  <div className="debt-callout-text">
                    <strong style={{ color: summary.debtResult.from === 'Yamil' ? 'var(--yamil)' : 'var(--celeste-c)' }}>{summary.debtResult.from}</strong>
                    {' le debe a '}
                    <strong style={{ color: summary.debtResult.to === 'Yamil' ? 'var(--yamil)' : 'var(--celeste-c)' }}>{summary.debtResult.to}</strong>
                  </div>
                  <div className="debt-callout-amount">{fmt(summary.debtResult.amount)}</div>
                </>
              ) : (
                <div className="debt-callout-text" style={{ color: 'var(--green)', fontWeight: 600 }}>
                  Están al día. Sin deuda pendiente este mes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Detalle — Categoría y Medio se ocultan en móvil */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="section-title" style={{ margin: 0 }}>Detalle de gastos compartidos</span>
          <select value={filterCard} onChange={e => setFilterCard(e.target.value)} style={{ width: 'auto', fontSize: '0.82rem', padding: '0.35rem 0.65rem' }}>
            <option value="all">Todos</option>
            <option value="VISA">VISA</option>
            <option value="AMEX">AMEX</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        {loading ? <div className="loading">Cargando…</div>
        : sharedExpenses.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>Sin gastos compartidos este mes.</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Descripción</th>
                    <th className="col-categoria">Categoría</th>
                    <th className="col-medio">Tarjeta</th>
                    <th>Pagó</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {sharedExpenses.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: es })}
                      </td>
                      <td>{tx.description || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                      <td className="col-categoria" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.category}</td>
                      <td className="col-medio" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{cardLabel(tx.payment_method)}</td>
                      <td><span className={`tag tag-${tx.profiles?.name?.toLowerCase()}`}>{tx.profiles?.name}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>{fmt(tx.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <SettlementModal
          onClose={() => setShowModal(false)}
          onSave={addSettlement}
          userId={user?.id}
          profiles={profiles}
          summary={summary}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          title="Eliminar transferencia"
          message="Esta acción no se puede deshacer."
          onConfirm={handleDeleteSettlement}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
