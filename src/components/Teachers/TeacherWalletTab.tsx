"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, Wallet, ArrowUpRight, CheckCircle2, Clock, XCircle, Banknote } from "lucide-react"
import { paymentsApi } from "@/lib/api"
import { getSimPayoutPending, getSimPayoutHistory } from "@/lib/sim-billing-store"

interface Props {
    trainerId: string | number
}

interface PendingPayout {
    id: number | string
    amount: number
    status: string
    paymentMethod?: string
    createdAt: string
    isPaidOut?: boolean | number
    payoutReference?: string
}

function getPayoutStatusBadge(status: string | undefined) {
    const s = (status || "").toLowerCase()
    if (s === "paid_out" || s === "completed") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" />Disetujui</span>
    }
    if (s === "paid" || s === "pending_payout" || s === "pending") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"><Clock className="w-3 h-3" />Pending</span>
    }
    if (s === "failed" || s === "rejected" || s === "cancelled") {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Ditolak</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{status || "—"}</span>
}

export function TeacherWalletTab({ trainerId }: Props) {
    const [payouts, setPayouts] = useState<PendingPayout[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            try {
                // Fetch payouts for this trainer
                const res = await paymentsApi.search({ TrainerId: trainerId, PageSize: 100 } as any)
                let items: PendingPayout[] = []
                if (res && res.items) items = res.items
                else if (res && res.data) items = res.data
                else if (Array.isArray(res)) items = res

                if (items.length === 0) {
                    // Fallback to SIM if API is empty or not supported yet
                    const simPending = getSimPayoutPending().filter(p => String(p.trainerId) === String(trainerId))
                    const simHistory = getSimPayoutHistory().filter(p => String(p.trainerId) === String(trainerId))
                    items = [...simPending, ...simHistory] as any[]
                }
                if (mounted) setPayouts(items)
            } catch (err) {
                console.error("Failed to load wallet payouts", err)
                // Fallback on error
                if (mounted) {
                    const simPending = getSimPayoutPending().filter(p => String(p.trainerId) === String(trainerId))
                    const simHistory = getSimPayoutHistory().filter(p => String(p.trainerId) === String(trainerId))
                    setPayouts([...simPending, ...simHistory] as any[])
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [trainerId])

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n).replace("IDR", "Rp")
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—"
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        } catch {
            return dateStr
        }
    }

    // Calculate balances
    let activeBalance = 0
    let pendingBalance = 0

    payouts.forEach(p => {
        const s = (p.status || "").toLowerCase()
        if (s === "paid_out" || s === "completed" || p.isPaidOut === true || p.isPaidOut === 1) {
            activeBalance += Number(p.amount || 0)
        } else if (s === "pending" || s === "pending_payout" || s === "paid") {
            pendingBalance += Number(p.amount || 0)
        }
    })

    return (
        <div className="p-4 sm:p-5 space-y-5">
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Saldo Aktif */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-50">
                            <Wallet className="w-5 h-5" />
                            <span className="font-semibold text-sm">Saldo Aktif (Telah Dicairkan)</span>
                        </div>
                        <div>
                            {loading ? (
                                <div className="h-10 w-32 bg-white/20 animate-pulse rounded-lg" />
                            ) : (
                                <p className="text-3xl font-black tracking-tight">{formatCurrency(activeBalance)}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Saldo Pending */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <span className="font-semibold text-sm">Saldo Pending</span>
                    </div>
                    <div>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
                        ) : (
                            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{formatCurrency(pendingBalance)}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                            Akan dicairkan manual oleh admin melalui menu Payout.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Riwayat Transaksi ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-gray-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Riwayat Transaksi Payout</h3>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Memuat riwayat transaksi...</p>
                    </div>
                ) : payouts.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Belum ada riwayat transaksi payout.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                                <tr>
                                    <th className="px-5 py-3 whitespace-nowrap">ID / Referensi</th>
                                    <th className="px-5 py-3 whitespace-nowrap">Tanggal</th>
                                    <th className="px-5 py-3 whitespace-nowrap">Nominal</th>
                                    <th className="px-5 py-3 whitespace-nowrap">Metode</th>
                                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {payouts.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">#{p.id}</p>
                                            {p.payoutReference && (
                                                <p className="text-[10px] text-gray-400 mt-0.5 break-all max-w-[150px]">{p.payoutReference}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                            {formatDate(p.createdAt)}
                                        </td>
                                        <td className="px-5 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatCurrency(p.amount)}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                                            {p.paymentMethod || "Bank Transfer"}
                                        </td>
                                        <td className="px-5 py-3">
                                            {getPayoutStatusBadge(p.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
