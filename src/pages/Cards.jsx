import { useState } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfirmDialog from '../components/ConfirmDialog'
import { PAYMENT_METHODS, pmTag } from '../lib/paymentMethods'

const CATEGORIES = [
  'Ahorro', 'Alquiler', 'Auto', 'Educación', 'Entretenimiento', 'Farmacia',
  'Hogar', 'Mascotas', 'Regalos', 'Reserva MP', 'Restaurante / Delivery', 'Ropa',
  'Salud', 'Servicios', 'Stämm', 'Subte', 'Sueldo',
  'Supermercado', 'Suscripciones', 'Transporte',
  'Otro',
]

const CARD_METHODS = PAYMENT_METHODS.filter(p => p.value === 'visa' || p.value === 'amex')

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function CardTransactionModal({ onClose, onSave, userId, existing, defaultPM }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState(
    existing
      ? {
          type:           existing.type,
          amount:         existing.amount.toString(),
          date:           existing.date,
          category:       existing.category,
          description:    existing.description || '',
          is_shared:      existing.is_shared,
          payment_method: existing.payment_method || 'visa',
        }
      : {
          type: 'expense', amount: '', date: today, category: '',
          description: '', is_shared: false,
          payment_method: defaultPM || 'visa',
        }
  )
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.amount || !form.date) return
    setLoading(true)
    const payload = {
      ...form,
      amount:   Number(form.amount),
      category: form.category || 'Otro',
    }
    if (!existing) payload.user_id = userId
    await onSave(payload)
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{existing ? 'Editar movimiento' : 'Nuevo gasto de tarjeta'}</h2>

        {/* Tarjeta */}
        <div className="form-row">
          <label className="form-label">Tarjeta</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {CARD_METHODS.map(p => (
              <button key={p.value} onClick={() => set('payment_method', p.value)} className="btn" style={{
                flex: 1, justifyContent: 'center',
                background: form.payment_method === p.value ? 'var(--accent-lite)' : 'var(--bg-input)',
                color: form.payment_method === p.value ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${form.payment_method === p.value ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-row">
            <label className="form-label">Monto ($)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0" min="0" autoFocus />
          </div>
          <div className="form-row">
            <label className="form-label">Fecha</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Categoría</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">Seleccioná una categoría</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Descripción (opcional)</label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Ej: Spotify, Amazon" />
        </div>

        <div className="form-row">
          <label className="toggle-wrapper">
            <div className={`toggle ${form.is_shared ? 'on' : ''}`} onClick={() => set('is_shared', !form.is_shared)} />
            <span style={{ fontSize: '0.875rem', color: form.is_shared ? 'var(--accent)' : 'var(--text-muted)' }}>
              Gasto compartido
            </span>
          </label>
        </div>

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

function CardTable({ txs, user, onEdit, onDelete, emptyText }) {
  if (txs.length === 0) return (
    <div className="empty-state" style={{ padding: '1.5rem' }}>{emptyText}</div>
  )
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th className="col-categoria">Categoría</th>
              <th className="col-medio">Tarjeta</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id}>
                <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {format(new Date(tx.date + 'T00:00:00'), 'd MMM', { locale: es })}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {tx.description || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    {tx.is_shared && <span className="tag tag-shared">compartido</span>}
                  </div>
                </td>
                <td className="col-categoria" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.category}</td>
                <td className="col-medio">{pmTag(tx.payment_method)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>
                  −{fmt(tx.amount)}
                </td>
                <td>
                  {tx.user_id === user?.id && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-ghost" onClick={() => onEdit(tx)} title="Editar">✎</button>
                      <button className="btn btn-danger" onClick={() => onDelete(tx.id)} title="Eliminar">✕</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Cards({ selectedMonth }) {
  const { user } = useAuth()
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useFinances(selectedMonth)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [defaultPM, setDefaultPM] = useState('visa')
  const [confirmId, setConfirmId] = useState(null)

  // Solo movimientos propios de tarjeta
  const mine      = transactions.filter(tx => tx.user_id === user?.id && tx.type === 'expense')
  const cardTxs   = mine.filter(tx => tx.payment_method === 'visa' || tx.payment_method === 'amex')

  const visaPersonal   = cardTxs.filter(t => t.payment_method === 'visa' && !t.is_shared)
  const visaShared     = cardTxs.filter(t => t.payment_method === 'visa' &&  t.is_shared)
  const amexPersonal   = cardTxs.filter(t => t.payment_method === 'amex' && !t.is_shared)
  const amexShared     = cardTxs.filter(t => t.payment_method === 'amex' &&  t.is_shared)

  const visaTotal      = cardTxs.filter(t => t.payment_method === 'visa').reduce((s,t) => s + Number(t.amount), 0)
  const amexTotal      = cardTxs.filter(t => t.payment_method === 'amex').reduce((s,t) => s + Number(t.amount), 0)
  const visaSharedTotal= visaShared.reduce((s,t) => s + Number(t.amount), 0)
  const amexSharedTotal= amexShared.reduce((s,t) => s + Number(t.amount), 0)
  const visaPersonalTotal = visaPersonal.reduce((s,t) => s + Number(t.amount), 0)
  const amexPersonalTotal = amexPersonal.reduce((s,t) => s + Number(t.amount), 0)

  async function handleDelete() { await deleteTransaction(confirmId); setConfirmId(null) }
  async function handleSave(data) {
    if (editing) await updateTransaction(editing.id, data)
    else         await addTransaction(data)
  }

  function openNew(pm) { setDefaultPM(pm); setEditing(null); setShowModal(true) }
  function openEdit(tx) { setEditing(tx); setShowModal(true) }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tarjetas</h1>
        <button className="btn btn-primary" onClick={() => openNew('visa')}>+ Nuevo</button>
      </div>

      {loading ? <div className="loading">Cargando…</div> : (
        <>
          {/* Resumen por tarjeta */}
          {(visaTotal > 0 || amexTotal > 0) && (
            <div className="cards-row mb-3">
              {visaTotal > 0 && (
                <div className="card-sm" style={{ cursor: 'pointer' }} onClick={() => openNew('visa')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">VISA</div>
                      <div className="stat-value negative" style={{ fontSize: '1.2rem' }}>{fmt(visaTotal)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      <div>Personal: {fmt(visaPersonalTotal)}</div>
                      <div>Compartido: {fmt(visaSharedTotal)}</div>
                    </div>
                  </div>
                </div>
              )}
              {amexTotal > 0 && (
                <div className="card-sm" style={{ cursor: 'pointer' }} onClick={() => openNew('amex')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">AMEX</div>
                      <div className="stat-value negative" style={{ fontSize: '1.2rem' }}>{fmt(amexTotal)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      <div>Personal: {fmt(amexPersonalTotal)}</div>
                      <div>Compartido: {fmt(amexSharedTotal)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VISA */}
          {(visaPersonal.length > 0 || visaShared.length > 0) && (
            <>
              <div className="mb-3">
                <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                  <span>VISA — Personal</span>
                  <button className="btn btn-soft" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    onClick={() => openNew('visa')}>+ Nuevo</button>
                </div>
                <CardTable txs={visaPersonal} user={user} onEdit={openEdit}
                  onDelete={id => setConfirmId(id)} emptyText="Sin gastos personales en VISA." />
              </div>
              {visaShared.length > 0 && (
                <div className="mb-3">
                  <div className="section-title" style={{ marginBottom: '0.75rem' }}>VISA — Compartidos</div>
                  <CardTable txs={visaShared} user={user} onEdit={openEdit}
                    onDelete={id => setConfirmId(id)} emptyText="" />
                </div>
              )}
            </>
          )}

          {/* AMEX */}
          {(amexPersonal.length > 0 || amexShared.length > 0) && (
            <>
              <div className="mb-3">
                <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                  <span>AMEX — Personal</span>
                  <button className="btn btn-soft" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    onClick={() => openNew('amex')}>+ Nuevo</button>
                </div>
                <CardTable txs={amexPersonal} user={user} onEdit={openEdit}
                  onDelete={id => setConfirmId(id)} emptyText="Sin gastos personales en AMEX." />
              </div>
              {amexShared.length > 0 && (
                <div className="mb-3">
                  <div className="section-title" style={{ marginBottom: '0.75rem' }}>AMEX — Compartidos</div>
                  <CardTable txs={amexShared} user={user} onEdit={openEdit}
                    onDelete={id => setConfirmId(id)} emptyText="" />
                </div>
              )}
            </>
          )}

          {/* Estado vacío */}
          {cardTxs.length === 0 && (
            <div className="empty-state">Sin movimientos de tarjeta este mes.</div>
          )}
        </>
      )}

      {showModal && (
        <CardTransactionModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          userId={user?.id}
          existing={editing}
          defaultPM={defaultPM}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message="Esta acción no se puede deshacer."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
