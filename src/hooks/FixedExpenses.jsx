import { useState } from 'react'
import { useFinances } from '../hooks/useFinances'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import ConfirmDialog from '../components/ConfirmDialog'


const CATEGORIES = [
  'Ahorro', 'Alquiler', 'Educación', 'Entretenimiento', 'Farmacia',
  'Hogar', 'Mascotas', 'Otro', 'Restaurante / Delivery', 'Ropa',
  'Salud', 'Servicios', 'Stämm', 'Subte', 'Sueldo',
  'Supermercado', 'Suscripciones', 'Transporte', 'Viajes',
]

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function IconCheck() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconUndo() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 5.17 6.22"/></svg>
}
function IconApply() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}

function FixedModal({ onClose, onSave, userId, existing }) {
  const [form, setForm] = useState(
    existing
      ? { name: existing.name, category: existing.category, amount: existing.amount.toString(), is_shared: existing.is_shared }
      : { name: '', category: '', amount: '', is_shared: false }
  )
  const [loading, setLoading] = useState(false)
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name || !form.category || form.amount === '') return
    setLoading(true)
    await onSave({ ...form, amount: Number(form.amount), user_id: userId, payment_method: 'efectivo' })
    setLoading(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{existing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</h2>
        <div className="form-row">
          <label className="form-label">Nombre</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ej: Gimnasio, Alquiler, Edenor…" autoFocus />
        </div>
        <div className="form-grid-2">
          <div className="form-row">
            <label className="form-label">Categoría</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Seleccioná</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label">Monto estimado ($)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" min="0" />
          </div>
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
          <button className="btn btn-primary" onClick={handleSave}
            disabled={loading || !form.name || !form.category || form.amount === ''}>
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApplyInline({ fx, onApply, onClose }) {
  const [amount, setAmount] = useState(fx.amount.toString())
  const [loading, setLoading] = useState(false)

  async function handleApply() {
    if (!amount) return
    setLoading(true)
    await onApply(Number(amount))
    setLoading(false)
    onClose()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem', border: '1px solid var(--accent)' }}>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
        style={{ width: 90, padding: '0.25rem 0.5rem', fontSize: '0.82rem' }} autoFocus />
      <button className="btn btn-primary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', gap: '0.3rem' }}
        onClick={handleApply} disabled={loading || !amount}>
        <IconCheck /> {loading ? '…' : 'OK'}
      </button>
      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.45rem', fontSize: '0.78rem' }} onClick={onClose}>✕</button>
    </div>
  )
}

function FixedRow({ fx, isApplied, onApply, onUndo, onEdit, onDelete, monthLabel }) {
  const [showApply, setShowApply] = useState(false)
  const [undoLoading, setUndoLoading] = useState(false)

  async function handleUndo() {
    setUndoLoading(true)
    await onUndo()
    setUndoLoading(false)
  }

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {fx.name}
          {fx.is_shared && <span className="tag tag-shared">compartido</span>}
        </div>
      </td>
      <td className="col-categoria" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{fx.category}</td>
      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)', whiteSpace: 'nowrap' }}>{fmt(fx.amount)}</td>
      <td>
        {/* Estado / botón Aplicar — siempre visible */}
        {isApplied ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600 }}>
              <IconCheck /> Ok
            </span>
            <button className="btn btn-ghost"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={handleUndo} disabled={undoLoading}>
              <IconUndo /> {undoLoading ? '…' : 'Undo'}
            </button>
          </div>
        ) : showApply ? (
          <ApplyInline fx={fx} onApply={onApply} onClose={() => setShowApply(false)} />
        ) : (
          <button className="btn btn-soft"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
            onClick={() => setShowApply(true)}>
            <IconApply /> Aplicar
          </button>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          <button className="btn btn-ghost" onClick={onEdit} title="Editar">✎</button>
          <button className="btn btn-danger" onClick={onDelete} title="Eliminar">✕</button>
        </div>
      </td>
    </tr>
  )
}

export default function FixedExpenses({ selectedMonth }) {
  const { user } = useAuth()
  const {
    fixedExpenses, loading,
    appliedFixedIds,
    addFixedExpense, updateFixedExpense, deleteFixedExpense,
    applyFixedExpense, undoFixedExpense,
  } = useFinances(selectedMonth)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const mine       = fixedExpenses.filter(fx => fx.user_id === user?.id)
  const applied    = appliedFixedIds(user?.id)
  const myPersonal = mine.filter(fx => !fx.is_shared)
  const myShared   = mine.filter(fx => fx.is_shared)

  const totalAll      = mine.reduce((s, fx) => s + Number(fx.amount), 0)
  const totalPersonal = myPersonal.reduce((s, fx) => s + Number(fx.amount), 0)
  const totalApplied  = mine.filter(fx => applied.has(fx.id)).reduce((s, fx) => s + Number(fx.amount), 0)
  const totalPending  = mine.filter(fx => !applied.has(fx.id)).reduce((s, fx) => s + Number(fx.amount), 0)

  const monthLabel = format(selectedMonth, 'MMM yyyy', { locale: es })

  async function handleDelete() { await deleteFixedExpense(confirmId); setConfirmId(null) }
  async function handleSave(data) {
    if (editing) await updateFixedExpense(editing.id, data)
    else         await addFixedExpense(data)
  }

  function renderTable(items, emptyLabel) {
    if (items.length === 0) return (
      <div className="empty-state" style={{ padding: '1.5rem' }}>Sin gastos fijos {emptyLabel}.</div>
    )
    return (
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="col-categoria">Categoría</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(fx => (
                <FixedRow
                  key={fx.id}
                  fx={fx}
                  isApplied={applied.has(fx.id)}
                  monthLabel={monthLabel}
                  onApply={(amount) => applyFixedExpense(fx, user?.id, amount)}
                  onUndo={() => undoFixedExpense(fx.id, user?.id)}
                  onEdit={() => { setEditing(fx); setShowModal(true) }}
                  onDelete={() => setConfirmId(fx.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gastos Fijos</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>+ Nuevo</button>
      </div>

      {mine.length > 0 && (
        <>
          {/* Desktop: grid-4 en fila */}
          <div className="grid-4 mb-3 mobile-hidden">
            <div className="card-sm"><div className="stat-label">Total fijos</div><div className="stat-value" style={{ fontSize: '1.05rem' }}>{fmt(totalAll)}</div></div>
            <div className="card-sm"><div className="stat-label">Personales</div><div className="stat-value" style={{ fontSize: '1.05rem' }}>{fmt(totalPersonal)}</div></div>
            <div className="card-sm"><div className="stat-label">Aplicados {monthLabel}</div><div className="stat-value negative" style={{ fontSize: '1.05rem' }}>{fmt(totalApplied)}</div></div>
            <div className="card-sm"><div className="stat-label">Pendientes</div><div className="stat-value muted" style={{ fontSize: '1.05rem' }}>{fmt(totalPending)}</div></div>
          </div>

          {/* Móvil: 2x2 compacto */}
          <div className="fixed-totals-mobile mb-3 desktop-hidden">
            <div className="card-sm"><div className="stat-label">Total</div><div className="stat-value" style={{ fontSize: '1rem' }}>{fmt(totalAll)}</div></div>
            <div className="card-sm"><div className="stat-label">Personales</div><div className="stat-value" style={{ fontSize: '1rem' }}>{fmt(totalPersonal)}</div></div>
            <div className="card-sm"><div className="stat-label">Aplicados</div><div className="stat-value negative" style={{ fontSize: '1rem' }}>{fmt(totalApplied)}</div></div>
            <div className="card-sm"><div className="stat-label">Pendientes</div><div className="stat-value muted" style={{ fontSize: '1rem' }}>{fmt(totalPending)}</div></div>
          </div>
        </>
      )}

      {loading ? <div className="loading">Cargando…</div> : (
        <>
          <div className="mb-3">
            <div className="section-title">Personales</div>
            {renderTable(myPersonal, 'personales')}
          </div>
          <div>
            <div className="section-title">Compartidos</div>
            {renderTable(myShared, 'compartidos')}
          </div>
        </>
      )}

      {showModal && (
        <FixedModal
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          userId={user?.id}
          existing={editing}
        />
      )}
      {confirmId && (
        <ConfirmDialog
          title="Eliminar gasto fijo"
          message="Se elimina de tu lista de fijos. Los movimientos ya generados no se afectan."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  )
}
