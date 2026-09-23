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
import { useI18n } from "@/components/providers/i18n-provider"
import dummyData from "@/data/billing-dummy.json"

function formatCurrency(amount: number, locale: string) {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(dateString: string, locale: string) {
    try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return dateString
        return date.toLocaleDateString(locale, {
            day: "2-digit", month: "short", year: "numeric"
        })
    } catch {
        return dateString
    }
}

type OrderStatus = "baru" | "lunas" | "aktif" | "gagal" | "selesai" | "menunggu_guru"

const STATUS_CONFIG: Record<OrderStatus, { key: string; badgeCls: string }> = {
    baru: { key: "user_detail.orders.status.pending", badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas: { key: "user_detail.orders.status.active", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    aktif: { key: "user_detail.orders.status.active", badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal: { key: "user_detail.orders.status.cancelled", badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai: { key: "user_detail.orders.status.completed", badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru: { key: "user_detail.orders.status.waiting_teacher", badgeCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" },
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
    const { t, locale } = useI18n()
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
                <p className="text-base font-medium text-gray-600 dark:text-gray-400">{t("user_detail.orders.empty", "Belum ada pesanan untuk pengguna ini")}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {t("user_detail.orders.title", "Riwayat Pesanan")}
                    <span className="text-sm font-medium text-gray-400">({orders.length})</span>
                </h4>
            </div>

            <div className="hidden md:block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-emerald-600 hover:bg-emerald-600">
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.order_id", "Kode")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.trainer", "Guru")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.package", "Paket")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.sessions", "Sesi")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.amount", "Nominal")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.date", "Tanggal")}</TableHead>
                            <TableHead className="font-semibold text-slate-50 dark:text-slate-50">{t("user_detail.orders.columns.status", "Status")}</TableHead>
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
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment, locale)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(order.bookingDate, locale)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`${st.badgeCls} border-0 font-medium w-fit`}>
                                            {t(st.key, st.key)}
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
                                <Badge className={`${st.badgeCls} border-0 font-medium`}>{t(st.key, st.key)}</Badge>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-200">
                                <p className="font-medium">{order.packageName}</p>
                                <p className="text-gray-500">{t("user_detail.orders.columns.trainer", "Guru")}: {order.trainerName}</p>
                                <p className="text-gray-500">{order.completedSessions}/{order.totalSessions} {t("user_detail.orders.session_label", "sesi")}</p>
                                <p className="text-gray-500">{formatDate(order.bookingDate, locale)}</p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPayment, locale)}</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    {t("user_detail.orders.detail", "Detail")} <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}