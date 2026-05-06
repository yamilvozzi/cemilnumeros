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

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const EMPTY_FORM = {
  type: 'expense', amount: '', date: '', category: '',
  description: '', is_shared: false, payment_method: 'efectivo',
}

function TransactionModal({ onClose, onSave, userId, existing }) {
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
          payment_method: existing.payment_method || 'efectivo',
        }
      : { ...EMPTY_FORM, date: today }
  )
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.amount || !form.date) return
    setLoading(true)
    const payload = {
      ...form,
      amount: Number(form.amount),
      category: form.category || 'Otro',  // si no se eligió categoría, asigna "Otro"
    }
    if (!existing) payload.user_id = userId
    await onSave(payload)
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{existing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>

        <div className="form-row">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['income', 'expense'].map(t => (
              <button key={t} onClick={() => set('type', t)} className="btn" style={{
                flex: 1, justifyContent: 'center',
                background: form.type === t ? (t === 'income' ? 'var(--green-lite)' : 'var(--red-lite)') : 'var(--bg-input)',
                color: form.type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                border: `1px solid ${form.type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
              }}>
                {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
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
          <label className="form-label">Medio de pago</label>
          <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
            {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label className="form-label">Descripción (opcional)</label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Ej: Cena en Lo de Marcos" />
        </div>

        {form.type === 'expense' && (
          <div className="form-row">
            <label className="toggle-wrapper">
              <div className={`toggle ${form.is_shared ? 'on' : ''}`} onClick={() => set('is_shared', !form.is_shared)} />
              <span style={{ fontSize: '0.875rem', color: form.is_shared ? 'var(--accent)' : 'var(--text-muted)' }}>
                Gasto compartido
              </span>
            </label>
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={loading || !form.amount}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Widget de carga rápida — solo visible para Celeste
function QuickEntry({ onSave, userId }) {
  const QUICK_CATS = ['Stämm', 'Subte']
  const [amounts, setAmounts] = useState({ 'Stämm': '', 'Subte': '' })
  const [saving, setSaving]   = useState(null)

  async function handleQuickSave(cat) {
    const amt = Number(amounts[cat])
    if (!amt) return
    setSaving(cat)
    await onSave({
      type:           'expense',
      amount:         amt,
      date:           format(new Date(), 'yyyy-MM-dd'),
      category:       cat,
      description:    '',
      is_shared:      false,
      payment_method: 'efectivo',
      user_id:        userId,
    })
    setAmounts(a => ({ ...a, [cat]: '' }))
    setSaving(null)
  }

  return (
    <div className="card mb-3" style={{ padding: '1rem 1.25rem' }}>
      <div className="section-title" style={{ marginBottom: '0.75rem' }}>Carga rápida</div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {QUICK_CATS.map(cat => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 140px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 48 }}>{cat}</span>
            <input
              type="number"
              value={amounts[cat]}
              onChange={e => setAmounts(a => ({ ...a, [cat]: e.target.value }))}
              placeholder="$"
              style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleQuickSave(cat)}
            />
            <button
              className="btn btn-soft"
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              onClick={() => handleQuickSave(cat)}
              disabled={saving === cat || !amounts[cat]}
            >
              {saving === cat ? '…' : '+ Agregar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Transactions({ selectedMonth }) {
  const { user, profile } = useAuth()
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useFinances(selectedMonth)

  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmId, setConfirmId]   = useState(null)
  const [filterPM, setFilterPM]     = useState('all')
  const [filterCat, setFilterCat]   = useState('all')

  const mine = transactions.filter(tx => tx.user_id === user?.id)

  const filtered = mine.filter(tx => {
    if (filterPM !== 'all' && (tx.payment_method || 'efectivo') !== filterPM) return false
    if (filterCat !== 'all' && tx.category !== filterCat) return false
    return true
  })

  const totalGasto   = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIngreso = filtered.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount), 0)

  const visaTotal = mine.filter(t => t.type === 'expense' && (t.payment_method === 'visa' || t.payment_method?.startsWith('visa_'))).reduce((s,t) => s+Number(t.amount), 0)
  const amexTotal = mine.filter(t => t.type === 'expense' && (t.payment_method === 'amex' || t.payment_method?.startsWith('amex_'))).reduce((s,t) => s+Number(t.amount), 0)

  async function handleDelete() { await deleteTransaction(confirmId); setConfirmId(null) }
  async function handleSave(data) {
    if (editing) await updateTransaction(editing.id, data)
    else         await addTransaction(data)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Movimientos</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>+ Nuevo</button>
      </div>

      {/* Widget carga rápida — solo Celeste */}
      {profile?.name === 'Celeste' && (
        <QuickEntry onSave={handleSave} userId={user?.id} />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select value={filterPM} onChange={e => setFilterPM(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">Todos los medios</option>
          {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No hay movimientos para mostrar.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  {/* col-categoria y col-medio se ocultan en móvil via CSS */}
                  <th className="col-categoria">Categoría</th>
                  <th className="col-medio">Medio</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
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
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      <span style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                        {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost" onClick={() => { setEditing(tx); setShowModal(true) }} title="Editar">✎</button>
                        <button className="btn btn-danger" onClick={() => setConfirmId(tx.id)} title="Eliminar">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="total-bar">
            <span>Total — {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {totalIngreso > 0 && <span style={{ color: 'var(--green)' }}>+{fmt(totalIngreso)}</span>}
              {totalGasto   > 0 && <span style={{ color: 'var(--red)'   }}>−{fmt(totalGasto)}</span>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <TransactionModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          userId={user?.id}
          existing={editing}
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
