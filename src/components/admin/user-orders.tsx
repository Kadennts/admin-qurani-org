"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, ArrowRight, Calendar } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import dummyData from "@/data/billing-dummy.json"

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string) {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString
        return date.toLocaleDateString("id-ID", {
            day: "2-digit", month: "short", year: "numeric"
        })
    } catch {
        return dateString
    }
}

type OrderStatus = "baru" | "lunas" | "aktif" | "gagal" | "selesai" | "menunggu_guru"

const STATUS_CONFIG: Record<OrderStatus, { label: string; badgeCls: string }> = {
    baru: { label: "Pending", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { label: "Aktif", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif: { label: "Aktif", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { label: "Batal", badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai: { label: "Selesai", badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru: { label: "Menunggu Guru", badgeCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
}

function getStage(status: string): OrderStatus {
    if (status === "cancelled") return "gagal"
    if (status === "completed") return "selesai"
    if (status === "pending_trainer") return "menunggu_guru"
    if (status === "active") return "aktif"
    return "baru"
}

export function UserOrders({ userId }: { userId: string }) {
    const router = useRouter()
    const lang = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en"

    const orders = useMemo(() => {
        return dummyData.bookings
            .filter((b) => String(b.userId) === String(userId))
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
    }, [userId])

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">Belum ada pesanan untuk pengguna ini</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Riwayat Pesanan
                    <span className="text-sm font-medium text-gray-400">({orders.length})</span>
                </h4>
            </div>

            <div className="hidden md:block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Kode</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Guru</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Paket</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Sesi</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Nominal</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Tanggal</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const st = STATUS_CONFIG[getStage(order.status)]
                            return (
                                <TableRow
                                    key={order.id}
                                    onClick={() => router.push(`/${lang}/billing/orders/${order.id}`)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                >
                                    <TableCell>
                                        <span className="font-semibold text-gray-900 dark:text-white">#{order.id}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{order.trainerName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{order.packageName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {order.completedSessions}/{order.totalSessions}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(order.bookingDate)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${st.badgeCls} border-0 font-medium w-fit`}>
                                            {st.label}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="md:hidden space-y-3">
                {orders.map((order) => {
                    const st = STATUS_CONFIG[getStage(order.status)]
                    return (
                        <div
                            key={order.id}
                            onClick={() => router.push(`/${lang}/billing/orders/${order.id}`)}
                            className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900 dark:text-white">#{order.id}</span>
                                <Badge className={`${st.badgeCls} border-0 font-medium`}>{st.label}</Badge>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                                <p className="font-medium">{order.packageName}</p>
                                <p className="text-gray-500">Guru: {order.trainerName}</p>
                                <p className="text-gray-500">{order.completedSessions}/{order.totalSessions} sesi</p>
                                <p className="text-gray-500">{formatDate(order.bookingDate)}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment)}</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    Detail <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}