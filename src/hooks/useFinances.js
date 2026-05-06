import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function useFinances(selectedMonth) {
  const [transactions,   setTransactions]   = useState([])
  const [settlements,    setSettlements]    = useState([])
  const [accounts,       setAccounts]       = useState([])
  const [profiles,       setProfiles]       = useState([])
  const [fixedExpenses,  setFixedExpenses]  = useState([])
  const [loading,        setLoading]        = useState(true)

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(selectedMonth),   'yyyy-MM-dd')

  useEffect(() => { fetchAll() }, [selectedMonth])

  async function fetchAll() {
    setLoading(true)
    const [txRes, stRes, accRes, profRes, fxRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('reference_month', format(selectedMonth, 'yyyy-MM')).order('date', { ascending: false }),
      supabase.from('settlements').select('*').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('accounts').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('fixed_expenses').select('*'),
    ])

    const profileList = profRes.data || []
    const profileMap  = {}
    profileList.forEach(p => { profileMap[p.id] = p })

    const enrichedTx = (txRes.data || []).map(tx => ({
      ...tx,
      profiles: profileMap[tx.user_id] ? { name: profileMap[tx.user_id].name } : null,
    }))

    const enrichedSettlements = (stRes.data || []).map(st => ({
      ...st,
      from: { id: st.from_user_id, profiles: { name: profileMap[st.from_user_id]?.name } },
      to:   { id: st.to_user_id,   profiles: { name: profileMap[st.to_user_id]?.name   } },
    }))

    const enrichedAccounts = (accRes.data || []).map(acc => ({
      ...acc,
      profiles: profileMap[acc.user_id] ? { name: profileMap[acc.user_id].name } : null,
    }))

    const enrichedFixed = (fxRes.data || []).map(fx => ({
      ...fx,
      profiles: profileMap[fx.user_id] ? { name: profileMap[fx.user_id].name } : null,
    }))

    setTransactions(enrichedTx)
    setSettlements(enrichedSettlements)
    setAccounts(enrichedAccounts)
    setProfiles(profileList)
    setFixedExpenses(enrichedFixed)
    setLoading(false)
  }

  // ── HELPERS ─────────────────────────────────────────────

  // Returns set of fixed_expense_ids already applied this month by a user
  function appliedFixedIds(userId) {
    const ids = new Set()
    transactions.forEach(tx => {
      if (tx.fixed_expense_id && tx.user_id === userId) {
        ids.add(tx.fixed_expense_id)
      }
    })
    return ids
  }

  // Returns the transaction id for an applied fixed expense (for undo)
  function appliedTxId(fixedExpenseId, userId) {
    const tx = transactions.find(t => t.fixed_expense_id === fixedExpenseId && t.user_id === userId)
    return tx?.id ?? null
  }

  // ── CALCULATIONS ────────────────────────────────────────

  function calcSummary(userId) {
    try {
    if (!userId || profiles.length < 2) return null

    const profileMap = {}
    profiles.forEach(p => { profileMap[p.id] = p })

    const agg = {}
    profiles.forEach(p => {
      agg[p.id] = { id: p.id, name: p.name, totalIncome: 0, totalExpense: 0, sharedPaid: 0 }
    })

    let totalShared = 0

    transactions.forEach(tx => {
      const a = agg[tx.user_id]
      if (!a) return
      if (tx.type === 'income') {
        a.totalIncome += Number(tx.amount)
      } else {
        a.totalExpense += Number(tx.amount)
        if (tx.is_shared) { a.sharedPaid += Number(tx.amount); totalShared += Number(tx.amount) }
      }
    })

    // Settlements: enviadas suman al gasto, recibidas al ingreso
    settlements.forEach(st => {
      if (agg[st.from_user_id]) agg[st.from_user_id].totalExpense += Number(st.amount)
      if (agg[st.to_user_id])   agg[st.to_user_id].totalIncome   += Number(st.amount)
    })

    const splitPerPerson = totalShared / 2

    profiles.forEach(p => {
      const a    = agg[p.id]
      a.restante   = a.totalIncome - a.totalExpense
      a.sharedDebt = splitPerPerson - a.sharedPaid
    })

    settlements.forEach(st => {
      if (agg[st.from_user_id]) agg[st.from_user_id].sharedDebt -= Number(st.amount)
      if (agg[st.to_user_id])   agg[st.to_user_id].sharedDebt   += Number(st.amount)
    })

    const debtors   = profiles.filter(p => agg[p.id].sharedDebt >  0.01)
    const creditors = profiles.filter(p => agg[p.id].sharedDebt < -0.01)

    let debtResult = null
    if (debtors.length > 0 && creditors.length > 0) {
      debtResult = {
        from:   agg[debtors[0].id].name,
        fromId: debtors[0].id,
        to:     agg[creditors[0].id].name,
        toId:   creditors[0].id,
        amount: Math.abs(agg[debtors[0].id].sharedDebt),
      }
    }

    const myAccounts = accounts.filter(a => a.user_id === userId)
    const realTotal  = myAccounts.reduce((s, a) => s + Number(a.balance), 0)

    return {
      users: agg,
      me: agg[userId],
      totalShared,
      splitPerPerson,
      debtResult,
      realTotal,
      myAccounts,
    }
    } catch (e) {
      console.error('calcSummary error:', e)
      return null
    }
  }

  // ── MUTATIONS: transactions ──────────────────────────────

  async function addTransaction(data) {
    const payload = {
      ...data,
      reference_month: format(selectedMonth, 'yyyy-MM'),
    }
    const { error } = await supabase.from('transactions').insert(payload)
    if (!error) fetchAll()
    return { error }
  }

  async function updateTransaction(id, data) {
    // Al editar, no modificamos reference_month — el movimiento sigue en el mes donde fue creado
    const { reference_month, ...updateData } = data
    const { error } = await supabase.from('transactions').update(updateData).eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  async function deleteTransaction(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  // ── MUTATIONS: fixed expenses ────────────────────────────

  async function addFixedExpense(data) {
    const { error } = await supabase.from('fixed_expenses').insert(data)
    if (!error) fetchAll()
    return { error }
  }

  async function updateFixedExpense(id, data) {
    const { error } = await supabase.from('fixed_expenses').update(data).eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  async function deleteFixedExpense(id) {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  // Apply a single fixed expense as a transaction for the selected month
  async function applyFixedExpense(fx, userId, amount) {
    const row = {
      user_id:          userId,
      amount:           Number(amount),
      date:             monthStart,
      reference_month:  format(selectedMonth, 'yyyy-MM'),
      type:             'expense',
      category:         fx.category,
      description:      fx.name,
      is_shared:        fx.is_shared,
      payment_method:   fx.payment_method,
      fixed_expense_id: fx.id,
    }
    const { error } = await supabase.from('transactions').insert(row)
    if (!error) fetchAll()
    return { error }
  }

  // Undo: delete the transaction that was created by applying the fixed expense
  async function undoFixedExpense(fixedExpenseId, userId) {
    const txId = appliedTxId(fixedExpenseId, userId)
    if (!txId) return { error: new Error('No applied transaction found') }
    return deleteTransaction(txId)
  }

  // ── MUTATIONS: settlements ───────────────────────────────

  async function addSettlement(data) {
    const { error } = await supabase.from('settlements').insert(data)
    if (!error) fetchAll()
    return { error }
  }

  async function deleteSettlement(id) {
    const { error } = await supabase.from('settlements').delete().eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  // ── MUTATIONS: accounts ──────────────────────────────────

  async function upsertAccount(data) {
    const { error } = await supabase.from('accounts').upsert(data)
    if (!error) fetchAll()
    return { error }
  }

  async function deleteAccount(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) fetchAll()
    return { error }
  }

  return {
    transactions,
    settlements,
    accounts,
    profiles,
    fixedExpenses,
    loading,
    calcSummary,
    appliedFixedIds,
    appliedTxId,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    applyFixedExpense,
    undoFixedExpense,
    addSettlement,
    deleteSettlement,
    upsertAccount,
    deleteAccount,
    refresh: fetchAll,
  }
}
