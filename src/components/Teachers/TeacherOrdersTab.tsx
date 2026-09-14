"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Filter, AlertCircle } from "lucide-react"
import { fetchAdminBookings, type BillingPipelineOrder } from "@/lib/billing-bookings"
import { useRouter } from "next/navigation"

interface Props {
    trainerId: string | number
    locale?: string | string[]
}

const STATUS_CONFIG: Record<string, { label: string; dotCls: string; badgeCls: string }> = {
    baru: { label: "Pending", dotCls: "bg-amber-500", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { label: "Aktif", dotCls: "bg-sky-500", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif: { label: "Aktif", dotCls: "bg-sky-500", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { label: "Batal", dotCls: "bg-rose-500", badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai: { label: "Selesai", dotCls: "bg-blue-500", badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru: { label: "Pending", dotCls: "bg-amber-500", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
}

export function TeacherOrdersTab({ trainerId, locale }: Props) {
    const router = useRouter()
    const activeLocale = (Array.isArray(locale) ? locale[0] : locale) || "id"
    const [orders, setOrders] = useState<BillingPipelineOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        let mounted = true
        async function load() {
            setLoading(true)
            try {
                const data = await fetchAdminBookings({ trainerId: Number(trainerId) })
                if (mounted) setOrders(data)
            } catch (err) {
                console.error("Failed to load orders", err)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [trainerId])

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
    }

    const filtered = orders.filter(o => {
        const q = search.toLowerCase()
        if (q && !o.member.toLowerCase().includes(q) && !o.bookingCode.toLowerCase().includes(q) && !o.paket.toLowerCase().includes(q)) {
            return false
        }
        return true
    })

    return (
        <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari pesanan, nama murid, atau paket..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    />
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Memuat data pesanan...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Tidak ada pesanan ditemukan.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">ID Pesanan</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Murid</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Paket</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Nominal</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filtered.map((order) => {
                                    const st = STATUS_CONFIG[order.status] || STATUS_CONFIG["baru"]
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => router.push(`/${activeLocale}/billing/orders/${order.id}`)}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                {order.bookingCode}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                                                        {order.memberAvatar}
                                                    </div>
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[120px]">{order.member}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                <span className="block truncate max-w-[150px]">{order.paket}</span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(order.harga)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${st.badgeCls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                                {order.tglPesan}
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
    )
}
