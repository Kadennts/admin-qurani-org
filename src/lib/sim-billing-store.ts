// ── sim-billing-store.ts ────────────────────────────────────────────────────
// Store localStorage terpadu untuk Payout, Refund, Withdraw, dan Payment.
// Mengikuti pola sim-store.ts (register guru) agar data persist lintas halaman.
// Setiap fungsi approve/confirm/complete juga menulis ke TRANSACTIONS_KEY
// (milik sim-wallet-store.ts) agar halaman Transaksi ikut terupdate.

import { getSimTransactions } from "@/lib/sim-wallet-store"

// ── Storage Keys ──────────────────────────────────────────────────────────────
const PAYOUT_PENDING_KEY   = "qurani_sim_payout_pending"
const PAYOUT_HISTORY_KEY   = "qurani_sim_payout_history"
const REFUND_PENDING_KEY   = "qurani_sim_refund_pending"
const REFUND_PROCESSED_KEY = "qurani_sim_refund_processed"
const WITHDRAW_PENDING_KEY = "qurani_sim_withdraw_pending"
const WITHDRAW_HISTORY_KEY = "qurani_sim_withdraw_history"
const PAYMENT_LIST_KEY     = "qurani_sim_payment_list"
// Shared dengan sim-wallet-store.ts
const TRANSACTIONS_KEY     = "qurani_sim_transactions_v2"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimPayout {
    id: number | string
    userId?: number | string
    userName?: string
    trainerId?: number | string
    trainerName?: string
    bookingId?: number | string
    amount: number
    status: string
    paymentMethod?: string
    createdAt: string
    updatedAt?: string
    payoutReference?: string
    isPaidOut?: boolean
    notes?: string
}

export interface SimRefund {
    id: number | string
    userId?: number | string
    userName?: string
    trainerId?: number | string
    trainerName?: string
    bookingId?: number | string
    amount: number
    refundAmount?: number
    status: string
    paymentMethod?: string
    refundReason?: string
    createdAt: string
    updatedAt?: string
    notes?: string
}

export interface SimWithdraw {
    id: number | string
    userId?: number | string
    user?: { name?: string; email?: string; username?: string; avatar?: string }
    amount: number
    bankName?: string
    accountNumber?: string
    accountName?: string
    status: string
    notes?: string
    externalTransactionId?: string
    gatewayReference?: string
    createdAt: string
    updatedAt?: string
}

export interface SimPayment {
    id: number | string
    userId: number | string
    userName: string
    trainerId: number | string
    trainerName: string
    bookingId?: number | string
    amount: number
    status: string
    paymentMethod: string
    createdAt: string
    updatedAt?: string
    payoutReference?: string
    isPaidOut?: boolean
}

// ── Dummy Data ─────────────────────────────────────────────────────────────────

const DUMMY_PAYOUT_PENDING: SimPayout[] = [
    { id: "178572300220100000", userId: 101, userName: "Siti Rahmawati", trainerId: 201, trainerName: "Budi Haryanto", bookingId: "B-001", amount: 300000, status: "paid", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "178572300220200000", userId: 102, userName: "Ahmad Fauzan", trainerId: 202, trainerName: "Aisyah Putri", bookingId: "B-002", amount: 150000, status: "paid", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "178572300220300000", userId: 103, userName: "Siti Aminah", trainerId: 203, trainerName: "Hamid Khalil", bookingId: "B-003", amount: 250000, status: "paid", paymentMethod: "Bank BCA", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "178572300220400000", userId: 104, userName: "Ahmad Fauzi", trainerId: 204, trainerName: "Hana Rosyida", bookingId: "B-004", amount: 200000, status: "paid", paymentMethod: "DANA", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: "178572300220500000", userId: 105, userName: "Budi Santoso", trainerId: 205, trainerName: "Zaki Maulana", bookingId: "B-005", amount: 175000, status: "paid", paymentMethod: "OVO", createdAt: new Date(Date.now() - 259200000).toISOString() }
];

const DUMMY_PAYOUT_HISTORY: SimPayout[] = [
    { id: "178572300230100000", userId: 101, userName: "Siti Rahmawati", trainerId: 201, trainerName: "Budi Haryanto", bookingId: "B-006", amount: 400000, status: "paid_out", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 345600000).toISOString(), payoutReference: "PAY-2026-001", notes: "Transfer berhasil" },
    { id: "178572300230200000", userId: 102, userName: "Ahmad Fauzan", trainerId: 202, trainerName: "Aisyah Putri", bookingId: "B-007", amount: 250000, status: "paid_out", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 432000000).toISOString(), payoutReference: "PAY-2026-002" },
    { id: "178572300230300000", userId: 103, userName: "Siti Aminah", trainerId: 203, trainerName: "Hamid Khalil", bookingId: "B-008", amount: 180000, status: "paid_out", paymentMethod: "Bank BCA", createdAt: new Date(Date.now() - 518400000).toISOString(), payoutReference: "PAY-2026-003" },
    { id: "178572300230400000", userId: 104, userName: "Ahmad Fauzi", trainerId: 204, trainerName: "Hana Rosyida", bookingId: "B-009", amount: 350000, status: "paid_out", paymentMethod: "DANA", createdAt: new Date(Date.now() - 604800000).toISOString(), payoutReference: "PAY-2026-004" },
    { id: "178572300230500000", userId: 105, userName: "Budi Santoso", trainerId: 205, trainerName: "Zaki Maulana", bookingId: "B-010", amount: 220000, status: "paid_out", paymentMethod: "OVO", createdAt: new Date(Date.now() - 691200000).toISOString(), payoutReference: "PAY-2026-005" }
];

const DUMMY_REFUND_PENDING: SimRefund[] = [
    { id: "178572300240100000", userId: 101, userName: "Siti Rahmawati", trainerName: "Budi Haryanto", bookingId: "B-001", amount: 300000, refundAmount: 300000, status: "pending_refund", paymentMethod: "GoPay", refundReason: "Jadwal tidak sesuai", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "178572300240200000", userId: 102, userName: "Ahmad Fauzan", trainerName: "Aisyah Putri", bookingId: "B-002", amount: 150000, refundAmount: 150000, status: "pending_refund", paymentMethod: "Bank Transfer", refundReason: "Guru tidak tersedia", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "178572300240300000", userId: 103, userName: "Siti Aminah", trainerName: "Hamid Khalil", bookingId: "B-003", amount: 250000, refundAmount: 250000, status: "pending_refund", paymentMethod: "OVO", refundReason: "Kesalahan pembayaran", createdAt: new Date(Date.now() - 10800000).toISOString() },
    { id: "178572300240400000", userId: 104, userName: "Ahmad Fauzi", trainerName: "Hana Rosyida", bookingId: "B-004", amount: 200000, refundAmount: 200000, status: "pending_refund", paymentMethod: "DANA", refundReason: "Materi tidak sesuai", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: "178572300240500000", userId: 105, userName: "Budi Santoso", trainerName: "Zaki Maulana", bookingId: "B-005", amount: 175000, refundAmount: 175000, status: "pending_refund", paymentMethod: "Bank BCA", refundReason: "Jadwal bentrok", createdAt: new Date(Date.now() - 259200000).toISOString() }
];

const DUMMY_REFUND_PROCESSED: SimRefund[] = [
    { id: "178572300250100000", userId: 101, userName: "Siti Rahmawati", trainerName: "Budi Haryanto", bookingId: "B-006", amount: 400000, refundAmount: 400000, status: "refunded", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 345600000).toISOString(), notes: "Refund disetujui" },
    { id: "178572300250200000", userId: 102, userName: "Ahmad Fauzan", trainerName: "Aisyah Putri", bookingId: "B-007", amount: 250000, refundAmount: 250000, status: "refunded", paymentMethod: "Bank Transfer", createdAt: new Date(Date.now() - 432000000).toISOString(), notes: "Refund disetujui" },
    { id: "178572300250300000", userId: 103, userName: "Siti Aminah", trainerName: "Hamid Khalil", bookingId: "B-008", amount: 180000, refundAmount: 0, status: "rejected", paymentMethod: "OVO", createdAt: new Date(Date.now() - 518400000).toISOString(), notes: "Melebihi batas waktu" },
    { id: "178572300250400000", userId: 104, userName: "Ahmad Fauzi", trainerName: "Hana Rosyida", bookingId: "B-009", amount: 350000, refundAmount: 350000, status: "refunded", paymentMethod: "DANA", createdAt: new Date(Date.now() - 604800000).toISOString(), notes: "Refund disetujui" },
    { id: "178572300250500000", userId: 105, userName: "Budi Santoso", trainerName: "Zaki Maulana", bookingId: "B-010", amount: 220000, refundAmount: 0, status: "rejected", paymentMethod: "Bank BCA", createdAt: new Date(Date.now() - 691200000).toISOString(), notes: "Bukti tidak valid" }
];

const DUMMY_WITHDRAW_PENDING: SimWithdraw[] = [
    { id: "178572300260100000", userId: 101, user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" }, amount: 500000, bankName: "Bank BCA", accountNumber: "1234567890", accountName: "Siti Rahmawati", status: "pending", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "178572300260200000", userId: 102, user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" }, amount: 300000, bankName: "Mandiri", accountNumber: "0987654321", accountName: "Ahmad Fauzan", status: "approved", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "178572300260300000", userId: 103, user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" }, amount: 750000, bankName: "Bank BNI", accountNumber: "1122334455", accountName: "Siti Aminah", status: "pending", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "178572300260400000", userId: 104, user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" }, amount: 200000, bankName: "Bank BRI", accountNumber: "6677889900", accountName: "Ahmad Fauzi", status: "pending", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: "178572300260500000", userId: 105, user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" }, amount: 450000, bankName: "GoPay", accountNumber: "081234567890", accountName: "Budi Santoso", status: "approved", createdAt: new Date(Date.now() - 259200000).toISOString() }
];

const DUMMY_WITHDRAW_HISTORY: SimWithdraw[] = [
    { id: "178572300270100000", userId: 101, user: { name: "Siti Rahmawati", email: "siti.rahma@example.com", username: "siti_rahma" }, amount: 1000000, bankName: "Bank BCA", accountNumber: "1234567890", accountName: "Siti Rahmawati", status: "completed", gatewayReference: "WD-REF-001", createdAt: new Date(Date.now() - 345600000).toISOString() },
    { id: "178572300270200000", userId: 102, user: { name: "Ahmad Fauzan", email: "ahmad.fauzan@example.com", username: "fauzan_ahmad" }, amount: 300000, bankName: "Mandiri", accountNumber: "0987654321", accountName: "Ahmad Fauzan", status: "rejected", notes: "Rekening tidak valid", createdAt: new Date(Date.now() - 432000000).toISOString() },
    { id: "178572300270300000", userId: 103, user: { name: "Siti Aminah", email: "siti.aminah@example.com", username: "siti_a" }, amount: 500000, bankName: "Bank BNI", accountNumber: "1122334455", accountName: "Siti Aminah", status: "completed", gatewayReference: "WD-REF-003", createdAt: new Date(Date.now() - 518400000).toISOString() },
    { id: "178572300270400000", userId: 104, user: { name: "Ahmad Fauzi", email: "ahmad.fauzi@example.com", username: "ahmad_fauzi" }, amount: 250000, bankName: "Bank BRI", accountNumber: "6677889900", accountName: "Ahmad Fauzi", status: "completed", gatewayReference: "WD-REF-004", createdAt: new Date(Date.now() - 604800000).toISOString() },
    { id: "178572300270500000", userId: 105, user: { name: "Budi Santoso", email: "budi.santoso@example.com", username: "budisan" }, amount: 400000, bankName: "GoPay", accountNumber: "081234567890", accountName: "Budi Santoso", status: "rejected", notes: "Nama tidak sesuai", createdAt: new Date(Date.now() - 691200000).toISOString() }
];

const DUMMY_PAYMENTS: SimPayment[] = [
    { id: "178572300280100000", userId: 101, userName: "Siti Rahmawati", trainerId: 201, trainerName: "Budi Haryanto", bookingId: "B-001", amount: 300000, status: "pending", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "178572300280200000", userId: 102, userName: "Ahmad Fauzan", trainerId: 202, trainerName: "Aisyah Putri", bookingId: "B-002", amount: 150000, status: "pending", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "178572300280300000", userId: 103, userName: "Siti Aminah", trainerId: 203, trainerName: "Hamid Khalil", bookingId: "B-003", amount: 250000, status: "pending", paymentMethod: "Bank BCA", createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "178572300280400000", userId: 104, userName: "Ahmad Fauzi", trainerId: 204, trainerName: "Hana Rosyida", bookingId: "B-004", amount: 200000, status: "pending", paymentMethod: "DANA", createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: "178572300280500000", userId: 105, userName: "Budi Santoso", trainerId: 205, trainerName: "Zaki Maulana", bookingId: "B-005", amount: 175000, status: "pending", paymentMethod: "OVO", createdAt: new Date(Date.now() - 259200000).toISOString() },
    
    { id: "178572300280600000", userId: 101, userName: "Siti Rahmawati", trainerId: 201, trainerName: "Budi Haryanto", bookingId: "B-006", amount: 400000, status: "paid", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 345600000).toISOString() },
    { id: "178572300280700000", userId: 102, userName: "Ahmad Fauzan", trainerId: 202, trainerName: "Aisyah Putri", bookingId: "B-007", amount: 250000, status: "paid_out", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 432000000).toISOString() },
    { id: "178572300280800000", userId: 103, userName: "Siti Aminah", trainerId: 203, trainerName: "Hamid Khalil", bookingId: "B-008", amount: 180000, status: "paid", paymentMethod: "Bank BCA", createdAt: new Date(Date.now() - 518400000).toISOString() },
    { id: "178572300280900000", userId: 104, userName: "Ahmad Fauzi", trainerId: 204, trainerName: "Hana Rosyida", bookingId: "B-009", amount: 350000, status: "paid_out", paymentMethod: "DANA", createdAt: new Date(Date.now() - 604800000).toISOString() },
    { id: "178572300281000000", userId: 105, userName: "Budi Santoso", trainerId: 205, trainerName: "Zaki Maulana", bookingId: "B-010", amount: 220000, status: "paid", paymentMethod: "OVO", createdAt: new Date(Date.now() - 691200000).toISOString() }
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T[]): T[] {
    if (typeof window === "undefined") return fallback
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T[]
    } catch { return fallback }
}

function safeSet(key: string, data: unknown): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(key, JSON.stringify(data))
        // Broadcast perubahan ke halaman lain (Transaksi auto-refresh)
        window.dispatchEvent(new CustomEvent("sim-billing-update", { detail: { key } }))
    } catch { /* no-op */ }
}

function addToTransactions(entry: object): void {
    if (typeof window === "undefined") return
    try {
        const txs = getSimTransactions()
        txs.unshift(entry)
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs))
    } catch { /* no-op */ }
}

function nextId(): string {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
}

// ── INIT ──────────────────────────────────────────────────────────────────────

export function initSimBillingStore(forceReset = false): void {
    if (typeof window === "undefined") return
    
    if (forceReset) {
        localStorage.removeItem(PAYOUT_PENDING_KEY)
        localStorage.removeItem(PAYOUT_HISTORY_KEY)
        localStorage.removeItem(REFUND_PENDING_KEY)
        localStorage.removeItem(REFUND_PROCESSED_KEY)
        localStorage.removeItem(WITHDRAW_PENDING_KEY)
        localStorage.removeItem(WITHDRAW_HISTORY_KEY)
        localStorage.removeItem(PAYMENT_LIST_KEY)
    }

    if (!localStorage.getItem(PAYOUT_PENDING_KEY))
        localStorage.setItem(PAYOUT_PENDING_KEY, JSON.stringify(DUMMY_PAYOUT_PENDING))
    if (!localStorage.getItem(PAYOUT_HISTORY_KEY))
        localStorage.setItem(PAYOUT_HISTORY_KEY, JSON.stringify(DUMMY_PAYOUT_HISTORY))
    if (!localStorage.getItem(REFUND_PENDING_KEY))
        localStorage.setItem(REFUND_PENDING_KEY, JSON.stringify(DUMMY_REFUND_PENDING))
    if (!localStorage.getItem(REFUND_PROCESSED_KEY))
        localStorage.setItem(REFUND_PROCESSED_KEY, JSON.stringify(DUMMY_REFUND_PROCESSED))
    if (!localStorage.getItem(WITHDRAW_PENDING_KEY))
        localStorage.setItem(WITHDRAW_PENDING_KEY, JSON.stringify(DUMMY_WITHDRAW_PENDING))
    if (!localStorage.getItem(WITHDRAW_HISTORY_KEY))
        localStorage.setItem(WITHDRAW_HISTORY_KEY, JSON.stringify(DUMMY_WITHDRAW_HISTORY))
    if (!localStorage.getItem(PAYMENT_LIST_KEY))
        localStorage.setItem(PAYMENT_LIST_KEY, JSON.stringify(DUMMY_PAYMENTS))
}

// ── PAYOUT ────────────────────────────────────────────────────────────────────

export function getSimPayoutPending(): SimPayout[] {
    initSimBillingStore()
    return safeGet<SimPayout>(PAYOUT_PENDING_KEY, DUMMY_PAYOUT_PENDING)
}

export function getSimPayoutHistory(): SimPayout[] {
    initSimBillingStore()
    return safeGet<SimPayout>(PAYOUT_HISTORY_KEY, DUMMY_PAYOUT_HISTORY)
}

/**
 * Tandai payout sebagai selesai dibayarkan ke guru.
 * → item pindah dari pending ke history (status: paid_out)
 * → entri baru ditambahkan ke Transaksi
 */
export function confirmSimPayout(id: number | string, reference: string, notes?: string): void {
    const pending = getSimPayoutPending()
    const history = getSimPayoutHistory()
    const idx = pending.findIndex(p => p.id == id)
    if (idx === -1) return

    const item = pending[idx]
    pending.splice(idx, 1)

    const historyItem: SimPayout = {
        ...item,
        status: "paid_out",
        payoutReference: reference,
        notes: notes || undefined,
        updatedAt: new Date().toISOString(),
    }
    history.unshift(historyItem)

    // Tambah ke transaksi
    addToTransactions({
        id: nextId(),
        userId: item.userId,
        user: { name: item.userName },
        type: 4,
        typeName: "Payout",
        description: `Payout ke ${item.trainerName || "Guru"} — ref: ${reference}`,
        amount: -(item.amount),
        status: "completed",
        paymentMethod: item.paymentMethod || "—",
        referenceId: reference,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
    })

    safeSet(PAYOUT_PENDING_KEY, pending)
    safeSet(PAYOUT_HISTORY_KEY, history)
}

// ── REFUND ────────────────────────────────────────────────────────────────────

export function getSimRefundPending(): SimRefund[] {
    initSimBillingStore()
    return safeGet<SimRefund>(REFUND_PENDING_KEY, DUMMY_REFUND_PENDING)
}

export function getSimRefundProcessed(): SimRefund[] {
    initSimBillingStore()
    return safeGet<SimRefund>(REFUND_PROCESSED_KEY, DUMMY_REFUND_PROCESSED)
}

/**
 * Setujui refund.
 * → item pindah dari pending ke processed (status: refunded)
 * → entri baru ditambahkan ke Transaksi
 */
export function approveSimRefund(id: number | string, notes?: string): void {
    const pending = getSimRefundPending()
    const processed = getSimRefundProcessed()
    const idx = pending.findIndex(r => r.id == id)
    if (idx === -1) return

    const item = pending[idx]
    pending.splice(idx, 1)

    const processedItem: SimRefund = {
        ...item,
        status: "refunded",
        notes: notes || undefined,
        updatedAt: new Date().toISOString(),
    }
    processed.unshift(processedItem)

    // Tambah ke transaksi
    addToTransactions({
        id: nextId(),
        userId: item.userId,
        user: { name: item.userName },
        type: 5,
        typeName: "Refund",
        description: `Refund disetujui — ${item.refundReason || ""}`,
        amount: item.refundAmount ?? item.amount,
        status: "completed",
        paymentMethod: item.paymentMethod || "—",
        referenceId: `REFUND-${item.bookingId || item.id}`,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
    })

    safeSet(REFUND_PENDING_KEY, pending)
    safeSet(REFUND_PROCESSED_KEY, processed)
}

/**
 * Tolak refund.
 * → item pindah dari pending ke processed (status: rejected)
 * → TIDAK tambah ke transaksi
 */
export function rejectSimRefund(id: number | string, reason: string): void {
    const pending = getSimRefundPending()
    const processed = getSimRefundProcessed()
    const idx = pending.findIndex(r => r.id == id)
    if (idx === -1) return

    const item = pending[idx]
    pending.splice(idx, 1)

    const processedItem: SimRefund = {
        ...item,
        status: "rejected",
        notes: reason,
        updatedAt: new Date().toISOString(),
    }
    processed.unshift(processedItem)

    safeSet(REFUND_PENDING_KEY, pending)
    safeSet(REFUND_PROCESSED_KEY, processed)
}

// ── WITHDRAW ──────────────────────────────────────────────────────────────────

export function getSimWithdrawPending(): SimWithdraw[] {
    initSimBillingStore()
    return safeGet<SimWithdraw>(WITHDRAW_PENDING_KEY, DUMMY_WITHDRAW_PENDING)
}

export function getSimWithdrawHistory(): SimWithdraw[] {
    initSimBillingStore()
    return safeGet<SimWithdraw>(WITHDRAW_HISTORY_KEY, DUMMY_WITHDRAW_HISTORY)
}

/**
 * Setujui withdraw (status pending → approved, tetap di pending list).
 */
export function approveSimWithdraw(id: number | string): void {
    const pending = getSimWithdrawPending()
    const idx = pending.findIndex(w => w.id == id)
    if (idx === -1) return
    pending[idx].status = "approved"
    pending[idx].updatedAt = new Date().toISOString()
    safeSet(WITHDRAW_PENDING_KEY, pending)
}

/**
 * Tolak withdraw.
 * → item pindah dari pending ke history (status: rejected)
 * → TIDAK tambah ke transaksi
 */
export function rejectSimWithdraw(id: number | string, reason: string): void {
    const pending = getSimWithdrawPending()
    const history = getSimWithdrawHistory()
    const idx = pending.findIndex(w => w.id == id)
    if (idx === -1) return

    const item = pending[idx]
    pending.splice(idx, 1)

    const historyItem: SimWithdraw = {
        ...item,
        status: "rejected",
        notes: reason,
        updatedAt: new Date().toISOString(),
    }
    history.unshift(historyItem)

    safeSet(WITHDRAW_PENDING_KEY, pending)
    safeSet(WITHDRAW_HISTORY_KEY, history)
}

/**
 * Selesaikan withdraw (status approved → completed).
 * → item pindah dari pending ke history (status: completed)
 * → entri baru ditambahkan ke Transaksi
 */
export function completeSimWithdraw(
    id: number | string,
    extId?: string | null,
    ref?: string | null,
): void {
    const pending = getSimWithdrawPending()
    const history = getSimWithdrawHistory()
    const idx = pending.findIndex(w => w.id == id)
    if (idx === -1) return

    const item = pending[idx]
    pending.splice(idx, 1)

    const historyItem: SimWithdraw = {
        ...item,
        status: "completed",
        externalTransactionId: extId || undefined,
        gatewayReference: ref || undefined,
        updatedAt: new Date().toISOString(),
    }
    history.unshift(historyItem)

    // Tambah ke transaksi
    addToTransactions({
        id: nextId(),
        userId: item.userId,
        user: item.user,
        type: 2,
        typeName: "Withdraw",
        description: `Penarikan ke ${item.bankName || "Bank"} ${item.accountNumber ? `— ${item.accountNumber}` : ""}`,
        amount: -(item.amount),
        status: "completed",
        paymentMethod: item.bankName || "Bank Transfer",
        referenceId: ref || extId || `WD-${id}`,
        createdAt: new Date().toISOString(),
    })

    safeSet(WITHDRAW_PENDING_KEY, pending)
    safeSet(WITHDRAW_HISTORY_KEY, history)
}

// ── PAYMENT ───────────────────────────────────────────────────────────────────

export function getSimPayments(): SimPayment[] {
    initSimBillingStore()
    return safeGet<SimPayment>(PAYMENT_LIST_KEY, DUMMY_PAYMENTS)
}

/**
 * Tandai payment sebagai sudah dibayarkan (payout ke guru).
 * → update status payment ke paid_out
 * → entri baru di payout_history
 * → entri baru di Transaksi
 */
export function markSimPaymentAsPaidOut(
    id: number | string,
    reference: string,
    notes?: string,
): void {
    const payments = getSimPayments()
    const idx = payments.findIndex(p => p.id == id)
    if (idx === -1) return

    const item = payments[idx]
    payments[idx] = {
        ...item,
        status: "paid_out",
        isPaidOut: true,
        payoutReference: reference,
        updatedAt: new Date().toISOString(),
    }

    // Tambah ke payout history
    const payoutHistory = getSimPayoutHistory()
    payoutHistory.unshift({
        id: nextId(),
        userId: item.userId,
        userName: item.userName,
        trainerId: item.trainerId,
        trainerName: item.trainerName,
        amount: item.amount,
        status: "paid_out",
        paymentMethod: item.paymentMethod,
        payoutReference: reference,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
    })

    // Tambah ke transaksi
    addToTransactions({
        id: nextId(),
        userId: item.userId,
        user: { name: item.userName },
        type: 4,
        typeName: "Payout",
        description: `Payout ke ${item.trainerName} — ref: ${reference}`,
        amount: -(item.amount),
        status: "completed",
        paymentMethod: item.paymentMethod || "—",
        referenceId: reference,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
    })

    safeSet(PAYMENT_LIST_KEY, payments)
    safeSet(PAYOUT_HISTORY_KEY, payoutHistory)
}

// ── RESET (untuk testing) ─────────────────────────────────────────────────────

export function resetSimBillingStore(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(PAYOUT_PENDING_KEY)
    localStorage.removeItem(PAYOUT_HISTORY_KEY)
    localStorage.removeItem(REFUND_PENDING_KEY)
    localStorage.removeItem(REFUND_PROCESSED_KEY)
    localStorage.removeItem(WITHDRAW_PENDING_KEY)
    localStorage.removeItem(WITHDRAW_HISTORY_KEY)
    localStorage.removeItem(PAYMENT_LIST_KEY)
    initSimBillingStore()
}
