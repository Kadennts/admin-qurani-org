// ── sim-billing-store.ts ────────────────────────────────────────────────────
// Store localStorage terpadu untuk Payout, Refund, Withdraw, dan Payment.
// Mengikuti pola sim-store.ts (register guru) agar data persist lintas halaman.
// Setiap fungsi approve/confirm/complete juga menulis ke TRANSACTIONS_KEY
// (milik sim-wallet-store.ts) agar halaman Transaksi ikut terupdate.

import { getSimTransactions } from "@/lib/sim-wallet-store"

// ── Storage Keys ──────────────────────────────────────────────────────────────
// STORE_VERSION: Naikkan angka ini setiap kali dummy data berubah agar
// localStorage lama otomatis di-reset ke data terbaru.
const STORE_VERSION        = "v6-dummy-fix"  // ← ubah ini saat dummy data diperbarui
const STORE_VERSION_KEY    = "qurani_sim_billing_version"
const PAYOUT_PENDING_KEY   = "qurani_sim_payout_pending"
const PAYOUT_HISTORY_KEY   = "qurani_sim_payout_history"
const REFUND_PENDING_KEY   = "qurani_sim_refund_pending"
const REFUND_PROCESSED_KEY = "qurani_sim_refund_processed"
const WITHDRAW_PENDING_KEY = "qurani_sim_withdraw_pending"
const WITHDRAW_HISTORY_KEY = "qurani_sim_withdraw_history"
const PAYMENT_LIST_KEY     = "qurani_sim_payment_list"
// Shared dengan sim-wallet-store.ts
const TRANSACTIONS_KEY     = "qurani_sim_transactions_v3"

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
    sessionsInfo?: string
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

// ── DUMMY DATA (sesuai 10 orders di halaman Orders/Pesanan) ─────────────────
// Sumber kebenaran: billing-dummy.json bookings #3098, #3099, #3010, #3002, #3003, #3004, #3005, #3006, #3007, #3008
// Order lunas (#3010, #3002, #3003, #3007) → masuk PAYOUT_PENDING
// Order yang sudah dipayout (#3004, #3006) → masuk PAYOUT_HISTORY
// Order bermasalah/refund → masuk REFUND_PENDING / REFUND_PROCESSED

const DUMMY_PAYOUT_PENDING: SimPayout[] = [
    // Pesanan #3002 — Siti Aminah / Indi fitriani (status: Lunas, belum dipayout)
    { id: "178572300220100000", userId: 103, userName: "Siti Aminah", trainerName: "Indi fitriani", bookingId: 3002, amount: 90000, status: "pending", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 345600000).toISOString() },
    // Pesanan #3003 — Budi Santoso / Ustadz Iwan (status: Lunas, belum dipayout)
    { id: "178572300220200000", userId: 104, userName: "Budi Santoso", trainerName: "Ustadz Iwan", bookingId: 3003, amount: 705000, status: "pending", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 432000000).toISOString() },
    // Pesanan #3007 — Farid Al-Amin / Zain (status: Lunas, belum dipayout)
    { id: "178572300220300000", userId: 107, userName: "Farid Al-Amin", trainerName: "Zain", bookingId: 3007, amount: 387500, status: "pending", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 518400000).toISOString() },
    // Pesanan #3010 — Zulfa Hanum / Hasyim asy'ari (status: Selesai, belum dipayout)
    { id: "178572300220400000", userId: 110, userName: "Zulfa Hanum", trainerName: "Hasyim asy'ari, Lc", bookingId: 3010, amount: 250000, status: "pending", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 604800000).toISOString() },
];

const DUMMY_PAYOUT_HISTORY: SimPayout[] = [
    // Pesanan #3004 — Dewi Rahayu / Hasyim asy'ari (sudah dipayout ke guru)
    { id: "178572300230100000", userId: 105, userName: "Dewi Rahayu", trainerName: "Hasyim asy'ari, Lc", bookingId: 3004, amount: 90000, status: "paid_out", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 691200000).toISOString(), payoutReference: "PAY-2026-001", notes: "Transfer berhasil" },
    // Pesanan #3008 — Halimah Tussa'diyah / Hasyim asy'ari, Lc (sudah dipayout ke guru)
    { id: "178572300230200000", userId: 108, userName: "Halimah Tussa'diyah", trainerName: "Hasyim asy'ari, Lc", bookingId: 3008, amount: 90000, status: "paid_out", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 777600000).toISOString(), payoutReference: "PAY-2026-002", notes: "Transfer berhasil" },
];

const DUMMY_REFUND_PENDING: SimRefund[] = [
    // Pesanan #3002 — Siti Aminah / Indi fitriani (Lunas → refund karena kesalahan bayar)
    { id: "178572300240300000", userId: 103, userName: "Siti Aminah", trainerName: "Indi fitriani", bookingId: 3002, amount: 90000, refundAmount: 90000, status: "pending_refund", paymentMethod: "Qurani Wallet", refundReason: "Kesalahan pembayaran", sessionsInfo: "0 dari 1 Pertemuan", createdAt: new Date(Date.now() - 518400000).toISOString() },
    // Pesanan #3003 — Budi Santoso / Ustadz Iwan (Lunas → refund sebagian)
    { id: "178572300240400000", userId: 104, userName: "Budi Santoso", trainerName: "Ustadz Iwan", bookingId: 3003, amount: 705000, refundAmount: 352500, status: "pending_refund", paymentMethod: "GoPay", refundReason: "Materi tidak sesuai harapan", sessionsInfo: "5 dari 10 Pertemuan", createdAt: new Date(Date.now() - 604800000).toISOString() },
    // Pesanan #3004 — Dewi Rahayu / Hasyim asy'ari (Lunas → refund jadwal bentrok)
    { id: "178572300240500000", userId: 105, userName: "Dewi Rahayu", trainerName: "Hasyim asy'ari, Lc", bookingId: 3004, amount: 90000, refundAmount: 90000, status: "pending_refund", paymentMethod: "GoPay", refundReason: "Jadwal bentrok", sessionsInfo: "0 dari 1 Pertemuan", createdAt: new Date(Date.now() - 691200000).toISOString() },
];

const DUMMY_REFUND_PROCESSED: SimRefund[] = [
    // Pesanan #3006 — Nur Hidayah / Indi fitriani (Batal → refund disetujui)
    { id: "178572300250100000", userId: 106, userName: "Nur Hidayah", trainerName: "Indi fitriani", bookingId: 3006, amount: 595000, refundAmount: 595000, status: "refunded", paymentMethod: "GoPay", sessionsInfo: "0 dari 5 Pertemuan", createdAt: new Date(Date.now() - 777600000).toISOString(), updatedAt: new Date(Date.now() - 691200000).toISOString(), notes: "Refund disetujui — order dibatalkan" },
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
    { id: "178572300280100000", userId: 101, userName: "Fauzia Nurrohma", trainerId: 302, trainerName: "Indi Fitriani", bookingId: 3098, amount: 89600, status: "pending", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: "178572300280200000", userId: 102, userName: "Rahma Aulia", trainerId: 302, trainerName: "Indi Fitriani", bookingId: 3099, amount: 420000, status: "pending", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 345600000).toISOString() },
    { id: "178572300280300000", userId: 110, userName: "Zulfa Hanum", trainerId: 301, trainerName: "Hasyim asy'ari, Lc", bookingId: 3010, amount: 250000, status: "paid", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 432000000).toISOString() },
    { id: "178572300280400000", userId: 103, userName: "Siti Aminah", trainerId: 302, trainerName: "Indi fitriani", bookingId: 3002, amount: 90000, status: "paid", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 518400000).toISOString() },
    { id: "178572300280500000", userId: 104, userName: "Budi Santoso", trainerId: 303, trainerName: "Ustadz Iwan", bookingId: 3003, amount: 705000, status: "paid", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 604800000).toISOString() },
    { id: "178572300280600000", userId: 105, userName: "Dewi Rahayu", trainerId: 301, trainerName: "Hasyim asy'ari, Lc", bookingId: 3004, amount: 90000, status: "paid", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 691200000).toISOString() },
    { id: "178572300280700000", userId: 106, userName: "Nur Hidayah", trainerId: 302, trainerName: "Indi fitriani", bookingId: 3006, amount: 595000, status: "refunded", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 777600000).toISOString() },
    { id: "178572300280800000", userId: 107, userName: "Farid Al-Amin", trainerId: 305, trainerName: "Zain", bookingId: 3007, amount: 387500, status: "paid", paymentMethod: "GoPay", createdAt: new Date(Date.now() - 864000000).toISOString() },
    { id: "178572300280900000", userId: 108, userName: "Halimah Tussa'diyah", trainerId: 301, trainerName: "Hasyim asy'ari, Lc", bookingId: 3008, amount: 90000, status: "paid", paymentMethod: "Qurani Wallet", createdAt: new Date(Date.now() - 950400000).toISOString() },
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

    // Auto-reset jika versi store berubah (dummy data diperbarui)
    const savedVersion = localStorage.getItem(STORE_VERSION_KEY)
    if (savedVersion !== STORE_VERSION) {
        forceReset = true
        localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION)
    }
    
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

    // Sinkronisasi: update status payment di PAYMENT_LIST agar halaman Payment ikut berubah
    syncPaymentStatusFromOrder(item.bookingId || item.id, "paid_out")
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

    // Sinkronisasi: update status payment di PAYMENT_LIST agar halaman Payment ikut berubah
    syncPaymentStatusFromOrder(item.bookingId || item.id, "refunded")
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
 * Cari payment berdasarkan bookingId.
 */
export function getSimPaymentByBookingId(bookingId: number | string): SimPayment | undefined {
    return getSimPayments().find(p => p.bookingId == bookingId)
}

/**
 * Sinkronisasi status payment ketika status order berubah dari halaman lain.
 * Dipanggil saat: approve refund, confirm payout, dll.
 */
export function syncPaymentStatusFromOrder(
    bookingId: number | string,
    newStatus: string,
): void {
    const payments = getSimPayments()
    const idx = payments.findIndex(p => p.bookingId == bookingId)
    if (idx === -1) return
    payments[idx] = {
        ...payments[idx],
        status: newStatus,
        updatedAt: new Date().toISOString(),
    }
    safeSet(PAYMENT_LIST_KEY, payments)
}

/**
 * Tambah payment baru (misalnya dari sim order yang baru dibayar).
 */
export function addSimPayment(payment: SimPayment): void {
    const payments = getSimPayments()
    const existing = payments.findIndex(p => p.bookingId == payment.bookingId)
    if (existing !== -1) {
        // Update jika sudah ada
        payments[existing] = { ...payments[existing], ...payment, updatedAt: new Date().toISOString() }
    } else {
        payments.unshift(payment)
    }
    safeSet(PAYMENT_LIST_KEY, payments)
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
