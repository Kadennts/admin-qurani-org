"use client"

import React, { use, useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { SkeletonDetailPage } from "@/components/ui/skeletons"
import {
    ArrowLeft,
    User,
    BookOpen,
    CreditCard,
    Star,
    CheckCircle2,
    Clock,
    XCircle,
    MapPin,
    Phone,
    Mail,
    Calendar,
    ChevronDown,
    MessageSquare,
    GraduationCap,
    ShieldCheck,
    AlertCircle,
    Activity,
    FileText,
    History,
    Search,
} from "lucide-react"
import Link from "next/link"
import dummyData from "@/data/billing-dummy.json"
import { fetchBookingById, fetchBookingAuditTrail } from "@/lib/billing-bookings"
import { getSimOrderById, type SimOrder } from "@/lib/sim-store"

// ── helpers ───────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n)
}
function formatDate(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("id-ID", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
    })
}
function formatDateTime(iso: string | null) {
    if (!iso) return "—"
    return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}
function formatRelativeTime(iso: string | null) {
    if (!iso) return "—"
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins} menit lalu`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} jam lalu`
    return formatDateTime(iso)
}

// ── session status config ─────────────────────────────────────────────────────
const SESSION_STATUS = {
    completed: { label: "Selesai", icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    ongoing: { label: "Berlangsung", icon: Activity, cls: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    scheduled: { label: "Terjadwal", icon: Clock, cls: "text-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    cancelled: { label: "Batal", icon: XCircle, cls: "text-rose-500", bg: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
} as const

// ── booking status ────────────────────────────────────────────────────────────
const BOOKING_STATUS = {
    active:        { label: "Aktif",            dotCls: "bg-sky-500", badgeCls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800" },
    completed:     { label: "Selesai",          dotCls: "bg-emerald-500",    badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
    cancelled:     { label: "Batal",            dotCls: "bg-rose-500",     badgeCls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800" },
    menunggu_guru: { label: "Menunggu Guru",    dotCls: "bg-orange-500",   badgeCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800" },
    pending:       { label: "Menunggu Bayar",   dotCls: "bg-amber-500",   badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800" },
} as const

// ─── Zulfa Hanum (#3010) Dummy Data ──────────────────────────────────────────
const ZULFA_BOOKING = {
    id: 3010,
    bookingCode: "BK-QUR-3010",
    userName: "Zulfa Hanum",
    userEmail: "zulfa@email.com",
    trainerName: "Hasyim asy'ari, Lc",
    packageName: "3x Pertemuan",
    totalSessions: 3,
    completedSessions: 3,
    totalPayment: 250000,
    bookingDate: "2026-01-10T08:00:00.000Z",
    paymentGateway: "GoPay",
    paymentMethod: "Ummi",
    status: "completed",
    mode: "online",
}

const ZULFA_DETAIL = {
    bookingId: 3010,
    bookingCode: "BK-QUR-3010",
    member: {
        id: 110,
        name: "Zulfa Hanum",
        email: "zulfa@email.com",
        phone: "0812-3456-7890",
        location: "Jakarta Selatan",
        joinDate: "2025-10-15T00:00:00.000Z",
    },
    trainer: {
        id: 301,
        name: "Hasyim asy'ari, Lc",
        email: "hasyim@email.com",
        avatar: "https://c.superprof.com/i/m/11946808/600/20251105122731/11946808.webp",
        rating: 5.0,
        totalStudents: 245,
        specialization: "Tahsin, Tajwid & Talaqqi",
        location: "Kairo, Egypt (Al-Azhar)",
        yearsExperience: 12,
        subjects: ["Ummi", "Tajwid", "Talaqqi"],
    },
    payment: {
        invoiceNo: "INV-ZLF-3010",
        receiptRef: "GPY-77889900",
        method: "GoPay",
        status: "paid",
        paidAt: "2026-01-10T08:05:22.000Z",
        pricePackage: 220000,
        serviceFee: 0,
        tax: 30000,
        total: 250000,
    },
    graduationNote: "Lulus dengan baik tanpa catatan",
    sessions: [
        {
            no: 1,
            date: "Senin, 10 Jan 2026",
            time: "08:00 – 09:00",
            status: "completed",
            feedback: { rating: 5, pesan: "Pengucapan huruf makhraj saya mulai membaik, terima kasih Ustadz." },
        },
        {
            no: 2,
            date: "Senin, 17 Jan 2026",
            time: "08:00 – 09:00",
            status: "completed",
            feedback: { rating: 5, pesan: "Penjelasan hukum tajwid Nun mati sangat mudah dipahami." },
        },
        {
            no: 3,
            date: "Senin, 24 Jan 2026",
            time: "08:00 – 09:00",
            status: "completed",
            feedback: { rating: 5, pesan: "Alhamdulillah selesai 3 sesi, sangat puas dengan bimbingannya." },
        },
    ],
}

// ── Fauzia Nurrohma (#3098) — Menunggu Guru Dummy Data ──────────────────────────────────────────
const FAUZIA_BOOKING = {
    id: 3098,
    bookingCode: "BK-QUR-3098",
    userName: "Fauzia Nurrohma",
    userEmail: "fauzia.nurrohma@email.com",
    trainerName: "Indi Fitriani",
    packageName: "1x Pertemuan",
    totalSessions: 1,
    completedSessions: 0,
    totalPayment: 89600,
    bookingDate: "2026-04-02T10:30:00.000Z",
    paymentGateway: "GoPay",
    paymentMethod: "Tilawati",
    status: "menunggu_guru",
    mode: "online",
}

const FAUZIA_DETAIL = {
    bookingId: 3098,
    bookingCode: "BK-QUR-3098",
    member: {
        id: 211,
        name: "Fauzia Nurrohma",
        email: "fauzia.nurrohma@email.com",
        phone: "0813-2233-4455",
        location: "Tangerang, Banten",
        joinDate: "2026-03-20T00:00:00.000Z",
    },
    trainer: {
        id: 302,
        name: "Indi Fitriani",
        email: "indi.f@qurani.id",
        avatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
        rating: 4.9,
        totalStudents: 39,
        specialization: "Tahsinul Qur'an & Tahfidzul Qur'an",
        location: "Bekasi",
        yearsExperience: 5,
        subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
    },
    payment: {
        invoiceNo: "INV-FZN-3098",
        receiptRef: "GOPAY-20260402-FZN",
        method: "GoPay",
        status: "paid",
        paidAt: "2026-04-02T10:35:00.000Z",
        pricePackage: 80000,
        serviceFee: 0,
        tax: 9600,
        total: 89600,
    },
    sessions: [
        { no: 1, date: "Rabu, 09 Apr 2026", time: "10:00 – 11:00", status: "scheduled" },
    ],
}

// ── Rahma Aulia (#3099) Pending Dummy Data ───────────────────────────────────────────────
const RAHMA_BOOKING = {
    id: 3099,
    bookingCode: "BK-QUR-3099",
    userName: "Rahma Aulia",
    userEmail: "rahma.aulia@email.com",
    trainerName: "Indi Fitriani",
    packageName: "5x Pertemuan",
    totalSessions: 5,
    completedSessions: 0,
    totalPayment: 420000,
    bookingDate: "2026-04-01T09:00:00.000Z",
    paymentGateway: "—",
    paymentMethod: "Tilawati",
    status: "pending",
    mode: "online",
}

const RAHMA_DETAIL = {
    bookingId: 3099,
    bookingCode: "BK-QUR-3099",
    member: {
        id: 210,
        name: "Rahma Aulia",
        email: "rahma.aulia@email.com",
        phone: "0821-5566-7788",
        location: "Depok, Jawa Barat",
        joinDate: "2026-03-15T00:00:00.000Z",
    },
    trainer: {
        id: 302,
        name: "Indi Fitriani",
        email: "indi.f@qurani.id",
        avatar: "https://c.superprof.com/i/m/26923640/600/20250828080508/26923640.webp",
        rating: 4.9,
        totalStudents: 39,
        specialization: "Tahsinul Qur'an & Tahfidzul Qur'an",
        location: "Bekasi",
        yearsExperience: 5,
        subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
    },
    payment: {
        invoiceNo: "INV-RHM-3099",
        receiptRef: "—",
        method: "—",
        status: "pending",
        paidAt: null,
        pricePackage: 375000,
        serviceFee: 0,
        tax: 45000,
        total: 420000,
    },
    sessions: [
        { no: 1, date: "Kamis, 10 Apr 2026", time: "09:00 – 10:00", status: "scheduled" },
        { no: 2, date: "Kamis, 17 Apr 2026", time: "09:00 – 10:00", status: "scheduled" },
        { no: 3, date: "Kamis, 24 Apr 2026", time: "09:00 – 10:00", status: "scheduled" },
        { no: 4, date: "Kamis, 01 Mei 2026", time: "09:00 – 10:00", status: "scheduled" },
        { no: 5, date: "Kamis, 08 Mei 2026", time: "09:00 – 10:00", status: "scheduled" },
    ],
}

// ── Back URL ──────────────────────────────────────────────────────────────────
const BACK_URL = "/billing/orders"

function HeaderCard({ booking, detail, apiDetail }: { booking: any, detail: any, apiDetail: any }) {
    const isFromApi = !!apiDetail
    const bStatus = BOOKING_STATUS[booking.status as keyof typeof BOOKING_STATUS] || BOOKING_STATUS.pending
    const isPaid = detail.payment.status === "paid"

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 to-emerald-900 shadow-2xl mb-6">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            
            <div className="relative p-6 sm:p-8">
                {/* Top bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-800/50 pb-5 mb-5">
                    <div className="flex items-center gap-4">
                        <Link href={BACK_URL}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-800/50 text-emerald-200 hover:bg-emerald-700 hover:text-white transition-colors backdrop-blur-sm border border-emerald-700/50">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                    <span className="text-emerald-400">#</span> {booking.id}
                                </h1>
                                {booking.bookingCode && (
                                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-800/50 border border-emerald-700 font-mono text-sm text-emerald-200">
                                        {booking.bookingCode}
                                    </span>
                                )}
                                {isFromApi && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        API
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-emerald-300/80 font-medium">
                                Dibuat pada {formatDateTime(booking.bookingDate)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${bStatus.badgeCls.replace('bg-', 'bg-opacity-10 bg-')}`}>
                            <span className={`w-2 h-2 rounded-full ${bStatus.dotCls} shadow-[0_0_8px_currentColor]`} />
                            <span className="font-bold text-sm tracking-wide">{bStatus.label}</span>
                        </div>
                        {isPaid && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                <ShieldCheck className="w-3.5 h-3.5" /> Lunas · {detail.payment.method}
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">Murid</p>
                        <p className="text-white font-semibold truncate" title={booking.userName}>{booking.userName}</p>
                    </div>
                    <div>
                        <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">Pengajar</p>
                        <p className="text-white font-semibold truncate" title={booking.trainerName}>{booking.trainerName}</p>
                    </div>
                    <div>
                        <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">Program</p>
                        <div className="flex items-center gap-2">
                            <p className="text-white font-semibold truncate">{booking.packageName}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 text-emerald-300`}>
                                {booking.mode === "online" ? "Online" : "Offline"}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider mb-1">Total Biaya</p>
                        <p className="text-xl font-black text-white">{formatRupiah(detail.payment.total)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function BookingDetailContent({ id }: { id: number }) {
    const [simOrder, setSimOrder] = useState<SimOrder | null | undefined>(undefined)
    const [apiDetail, setApiDetail] = useState<any | null>(null)
    const [apiAuditTrail, setApiAuditTrail] = useState<any[]>([])
    const [apiLoading, setApiLoading] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)
    const [openFeedback, setOpenFeedback] = useState<Record<number, boolean>>({})
    const [activeTab, setActiveTab] = useState<"info" | "log">("info")
    const toggleFeedback = (no: number) => setOpenFeedback(prev => ({ ...prev, [no]: !prev[no] }))

    useEffect(() => {
        if (id >= 9001) {
            setSimOrder(getSimOrderById(id))
        } else {
            setSimOrder(null)
        }
    }, [id])

    useEffect(() => {
        if (id >= 9001) return

        setApiLoading(true)
        setApiError(null)
        Promise.all([
            fetchBookingById(id),
            fetchBookingAuditTrail(id).catch(() => [])
        ])
            .then(([data, trail]) => {
                setApiDetail(data)
                
                // Add dummy data for log if empty and id is 3099, 3098, 3010
                if (trail.length === 0 && id === 3099) {
                    setApiAuditTrail([
                        { statusName: "Pending", createdAt: "2026-04-01T09:00:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.", changedBy: "Rahma Aulia" }
                    ]);
                } else if (trail.length === 0 && id === 3098) {
                    setApiAuditTrail([
                        { statusName: "Menunggu Guru", createdAt: "2026-04-02T10:35:00.000Z", notes: "Pembayaran terkonfirmasi, menunggu konfirmasi guru.", changedBy: "System" },
                        { statusName: "Pending", createdAt: "2026-04-02T10:30:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.", changedBy: "Fauzia Nurrohma" }
                    ]);
                } else if (trail.length === 0 && id === 3010) {
                     setApiAuditTrail([
                        { statusName: "Selesai", createdAt: "2026-01-24T09:00:00.000Z", notes: "Semua sesi telah selesai.", changedBy: "System" },
                        { statusName: "Aktif", createdAt: "2026-01-10T08:05:22.000Z", notes: "Pembayaran terkonfirmasi.", changedBy: "System" },
                        { statusName: "Pending", createdAt: "2026-01-10T08:00:00.000Z", notes: "Pesanan baru dibuat, menunggu pembayaran.", changedBy: "Zulfa Hanum" }
                    ]);
                } else {
                    setApiAuditTrail(trail)
                }
            })
            .catch(err => {
                console.error("Failed to fetch booking detail:", err)
                setApiDetail(null)
                setApiError("Gagal memuat dari API.")
            })
            .finally(() => setApiLoading(false))
    }, [id])

    // Convert SimOrder to format matching API logic for unified view
    const [convertedSim, setConvertedSim] = useState<{ booking: any, detail: any } | null>(null)
    useEffect(() => {
        if (simOrder) {
            setConvertedSim({
                booking: {
                    id: simOrder.id,
                    bookingCode: `SIM-${simOrder.id}`,
                    userName: simOrder.member.name,
                    trainerName: simOrder.trainer.name,
                    packageName: simOrder.pkg.name,
                    totalSessions: simOrder.totalSessions,
                    completedSessions: simOrder.completedSessions,
                    totalPayment: simOrder.pkg.price,
                    bookingDate: simOrder.bookingDate,
                    paymentGateway: simOrder.paymentGateway,
                    paymentMethod: simOrder.paymentMethod,
                    status: simOrder.status === 'cancelled' ? 'cancelled' : simOrder.paymentStatus === 'paid' && simOrder.completedSessions > 0 ? 'active' : simOrder.paymentStatus === 'paid' ? 'completed' : 'pending',
                    mode: simOrder.mode
                },
                detail: {
                    ...simOrder,
                    payment: {
                        invoiceNo: simOrder.invoiceNo,
                        receiptRef: "—",
                        method: simOrder.paymentGateway || "—",
                        status: simOrder.paymentStatus,
                        paidAt: simOrder.paidAt,
                        pricePackage: simOrder.pkg.price,
                        serviceFee: simOrder.pkg.serviceFee,
                        tax: 0,
                        total: simOrder.pkg.price + simOrder.pkg.serviceFee
                    }
                }
            })
        }
    }, [simOrder])


    if (simOrder === undefined) return null

    const fallbackBooking = id === 3010 ? ZULFA_BOOKING : id === 3098 ? FAUZIA_BOOKING : id === 3099 ? RAHMA_BOOKING : dummyData.bookings.find(b => b.id === id)
    const fallbackDetail  = id === 3010 ? ZULFA_DETAIL  : id === 3098 ? FAUZIA_DETAIL  : id === 3099 ? RAHMA_DETAIL  : dummyData.bookingDetails.find(d => d.bookingId === id)
    
    const booking = convertedSim?.booking || apiDetail?.booking || fallbackBooking
    const detail  = convertedSim?.detail || apiDetail?.detail || fallbackDetail

    if (apiLoading && !booking && !detail) {
        return (
            <div className="p-4 max-w-[1200px] mx-auto">
                <SkeletonDetailPage showAvatar infoRows={6} />
            </div>
        )
    }

    if (!booking || !detail) {
        return (
            <div className="min-h-[80vh] bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col items-center justify-center gap-5 m-4">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-gray-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pesanan Tidak Ditemukan</h2>
                    <p className="text-gray-500 max-w-sm mx-auto">{apiError || `ID pesanan #${id} tidak ada dalam database kami.`}</p>
                </div>
                <Link href={BACK_URL}
                    className="mt-2 text-sm px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Pesanan
                </Link>
            </div>
        )
    }

    const sessions = detail.sessions as Array<{
        no: number
        date: string
        time: string
        status: keyof typeof SESSION_STATUS | "completed" | "scheduled" | "ongoing" | "cancelled"
        feedback?: { rating: number; pesan: string }
    }>
    
    const isBookingCancelled = booking.status === "cancelled"
    const isBookingActive = !isBookingCancelled && booking.status === "active" && booking.completedSessions > 0
    const paidStr = isBookingCancelled ? "Dibatalkan"
        : detail.payment.status === "paid"
            ? (isBookingActive ? "Aktif" : "Lunas")
            : "Belum Dibayar"
    
    const paidCls = isBookingCancelled
        ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
        : detail.payment.status === "paid"
            ? (isBookingActive
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800")
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            
    const sessCompleted = sessions.filter(s => s.status === "completed").length
    const pct = Math.round((sessCompleted / Math.max(1, booking.totalSessions)) * 100)
    const isPaid = detail.payment.status === "paid"

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1200px] mx-auto">
                <HeaderCard booking={booking} detail={detail} apiDetail={apiDetail} />

                {/* ── Tabs Navigation ── */}
                <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-800 mb-6 px-2">
                    <button
                        onClick={() => setActiveTab("info")}
                        className={`pb-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "info" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                    >
                        <FileText className="w-4 h-4" /> Informasi Pesanan
                    </button>
                    <button
                        onClick={() => setActiveTab("log")}
                        className={`pb-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "log" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"}`}
                    >
                        <Activity className="w-4 h-4" /> Log & Aktivitas
                        {apiAuditTrail.length > 0 && (
                            <span className="ml-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-[10px]">
                                {apiAuditTrail.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── Main grid (Tab Info) ── */}
                {activeTab === "info" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">

                    {/* ── LEFT column (7 cols) ── */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Progress Belajar */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                        <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Progress Belajar</h3>
                                        <p className="text-xs text-gray-500">{booking.packageName}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        {sessCompleted} <span className="text-gray-400 text-xs font-semibold">/ {booking.totalSessions} Sesi</span>
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative pt-2">
                                <div className="flex mb-2 items-center justify-between">
                                    <div className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400">
                                        {pct}% Selesai
                                    </div>
                                </div>
                                <div className="overflow-hidden h-2.5 mb-1 text-xs flex rounded-full bg-emerald-50 dark:bg-gray-800 shadow-inner">
                                    <div style={{ width: `${pct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"></div>
                                </div>
                            </div>
                        </div>

                        {/* Session List */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-500" /> Jadwal Pertemuan
                                </h3>
                                <span className="text-xs font-semibold bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                                    {sessions.length} Terjadwal
                                </span>
                            </div>
                            
                            {sessions.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Jadwal belum ditentukan</p>
                                    {!isPaid && <p className="text-xs text-amber-600 mt-1">Selesaikan pembayaran untuk mengatur jadwal.</p>}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                                    {sessions.map(s => {
                                        const sc = SESSION_STATUS[s.status as keyof typeof SESSION_STATUS]
                                        const Icon = sc?.icon ?? Clock
                                        const isDone = s.status === "completed"
                                        const fb = (s as unknown as { feedback?: { rating: number; pesan: string } }).feedback
                                        const isOpen = openFeedback[s.no]
                                        
                                        return (
                                            <div key={s.no} className="group transition-colors">
                                                <div
                                                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${isDone && isPaid ? "cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10" : ""}`}
                                                    onClick={() => isDone && isPaid && toggleFeedback(s.no)}
                                                >
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${s.status === "completed" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : s.status === "cancelled" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400"}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2.5 flex-wrap mb-1">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Sesi {s.no}</h4>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                booking.status === "cancelled"
                                                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                                                    : s.status === "completed"
                                                                        ? sc?.bg + " border-emerald-200 dark:border-emerald-500/20"
                                                                        : (booking.status === "pending" || booking.status === "menunggu_guru")
                                                                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                                                            : sc?.bg + " border-sky-200 dark:border-sky-500/20"
                                                            }`}>
                                                                {booking.status === "cancelled" ? "Dibatalkan" : s.status === "completed" ? "Selesai" : (booking.status === "pending" || booking.status === "menunggu_guru") ? "Pending" : sc?.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {s.date}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {s.time}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {isDone && isPaid && (
                                                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                                                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-500" : "group-hover:text-emerald-500"}`} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Feedback Dropdown */}
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen && fb ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
                                                    {fb && (
                                                        <div className="px-6 pb-5 pt-1">
                                                            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 p-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                                                        <MessageSquare className="w-3.5 h-3.5" /> Feedback Sesi
                                                                    </div>
                                                                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 shadow-sm">
                                                                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{fb.rating}.0</span>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">"{fb.pesan}"</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Catatan Kelulusan */}
                        {booking.status === "completed" && (detail as any).graduationNote && (
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-3 uppercase tracking-wider">
                                    <GraduationCap className="w-5 h-5" /> Catatan Kelulusan
                                </h3>
                                <div className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm rounded-xl p-4 border border-emerald-100/50 dark:border-emerald-800/30">
                                    <p className="text-emerald-900 dark:text-emerald-100 font-medium leading-relaxed italic">
                                        "{ (detail as any).graduationNote }"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Info Pembatalan */}
                        {isBookingCancelled && (detail as any).cancellationInfo && (
                            <div className="bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800/50 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-5 uppercase tracking-wider border-b border-rose-200 dark:border-rose-800/50 pb-3">
                                    <AlertCircle className="w-5 h-5" /> Detail Pembatalan
                                </h3>
                                <div className="grid gap-4 text-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                        <span className="text-rose-600/70 dark:text-rose-400/70 font-semibold">Alasan / Kategori</span>
                                        <span className="font-bold text-rose-900 dark:text-rose-200">{(detail as any).cancellationInfo.kategori}</span>
                                    </div>
                                    <div className="bg-white/60 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-100 dark:border-rose-900/50">
                                        <p className="text-rose-600/70 dark:text-rose-400/70 font-semibold text-xs mb-1">Catatan</p>
                                        <p className="text-rose-900 dark:text-rose-200 italic">"{(detail as any).cancellationInfo.ulasan}"</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                        <span className="text-rose-600/70 dark:text-rose-400/70 font-semibold">Resolusi</span>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800">
                                            {(detail as any).cancellationInfo.resolusi}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT column (5 cols) ── */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Member Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <User className="w-4 h-4" /> Informasi Murid
                            </h3>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-16 h-16 rounded-full border-4 border-emerald-50 dark:border-emerald-900/30 overflow-hidden shadow-sm flex-shrink-0">
                                    <img src={detail.member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.member.name || "M")}&background=10b981&color=fff&size=128`} alt={detail.member.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{detail.member.name || "—"}</h4>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">ID: {detail.member.id}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-emerald-500">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{detail.member.email || "—"}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-emerald-500">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{detail.member.phone || "—"}</span>
                                </div>
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-emerald-500">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{detail.member.location || "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Guru Info */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" /> Informasi Pengajar
                            </h3>
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-16 h-16 rounded-full border-4 border-sky-50 dark:border-sky-900/30 overflow-hidden shadow-sm flex-shrink-0">
                                    <img src={detail.trainer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.trainer.name || "G")}&background=0ea5e9&color=fff&size=128`} alt={detail.trainer.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{detail.trainer.name || "—"}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {detail.trainer.rating > 0 ? (
                                            <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-amber-600 font-bold text-xs border border-amber-200/50 dark:border-amber-700/50">
                                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {detail.trainer.rating}
                                            </span>
                                        ) : null}
                                        <span className="text-xs text-gray-500 font-medium">{detail.trainer.totalStudents} Murid</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm text-sky-500">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{detail.trainer.specialization || "Pengajar Qurani"}</span>
                                </div>
                                
                                {detail.trainer.subjects?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {detail.trainer.subjects.map((sub: string, i: number) => (
                                            <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-sm">
                                                {sub}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Detailed */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Rincian Pembayaran
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800 border-dashed">
                                    <span className="text-sm font-medium text-gray-500">Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${paidCls}`}>
                                        {paidStr}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Metode</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{detail.payment.method}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">No. Invoice</span>
                                        <span className="font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">{detail.payment.invoiceNo}</span>
                                    </div>
                                    {detail.payment.paidAt && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Waktu Bayar</span>
                                            <span className="text-gray-900 dark:text-gray-300 font-medium text-right text-xs">{formatDateTime(detail.payment.paidAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2.5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Harga Paket</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatRupiah(detail.payment.pricePackage)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Pajak / PPN</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{formatRupiah(detail.payment.tax)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Biaya Layanan</span>
                                        <span className={`font-semibold ${detail.payment.serviceFee === 0 ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}>
                                            {detail.payment.serviceFee === 0 ? "Gratis" : formatRupiah(detail.payment.serviceFee)}
                                        </span>
                                    </div>
                                    
                                    <div className="pt-3 mt-1 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <span className="font-bold text-gray-900 dark:text-white">Total Tagihan</span>
                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                            {formatRupiah(detail.payment.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                )}

                {/* ── Log Tab ── */}
                {activeTab === "log" && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm min-h-[400px]">
                        
                        <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-emerald-500" /> Riwayat & Aktivitas
                            </h3>
                            
                            {apiAuditTrail.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                                    <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada aktivitas tercatat untuk pesanan ini.</p>
                                </div>
                            ) : (
                                <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                                    {apiAuditTrail.map((log: any, idx: number) => {
                                        // Determine styling based on action
                                        const actionStr = String(log.action || log.statusName || log.statusText || "").toLowerCase();
                                        let dotColor = "bg-gray-200 border-gray-300 dark:bg-gray-800 dark:border-gray-700";
                                        let textColor = "text-gray-900 dark:text-white";
                                        
                                        if (actionStr.includes('selesai') || actionStr.includes('lunas')) {
                                            dotColor = "bg-emerald-100 border-emerald-500 dark:bg-emerald-900/50 dark:border-emerald-500";
                                            textColor = "text-emerald-700 dark:text-emerald-400";
                                        } else if (actionStr.includes('batal') || actionStr.includes('gagal')) {
                                            dotColor = "bg-rose-100 border-rose-500 dark:bg-rose-900/50 dark:border-rose-500";
                                            textColor = "text-rose-700 dark:text-rose-400";
                                        } else if (actionStr.includes('aktif') || actionStr.includes('mulai')) {
                                            dotColor = "bg-sky-100 border-sky-500 dark:bg-sky-900/50 dark:border-sky-500";
                                        } else if (actionStr.includes('menunggu')) {
                                            dotColor = "bg-amber-100 border-amber-500 dark:bg-amber-900/50 dark:border-amber-500";
                                        }

                                        return (
                                            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                
                                                {/* Icon */}
                                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 bg-white dark:bg-gray-900 ${dotColor} z-10 transition-transform duration-300 hover:scale-110`}>
                                                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                                                </div>
                                                
                                                {/* Content Card */}
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm mb-6 hover:shadow-md transition-shadow group-hover:border-emerald-200 dark:group-hover:border-emerald-800/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`font-black text-sm uppercase tracking-wider ${textColor}`}>
                                                            {log.action || log.statusName || log.statusText || "Update Status"}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                                            {formatRelativeTime(log.createdAt || log.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                        {log.description || log.notes || log.message || "Perubahan status pesanan."}
                                                    </p>
                                                    {log.changedBy && (
                                                        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                <User className="w-3 h-3 text-gray-500" />
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-500">
                                                                Oleh <span className="font-bold text-gray-700 dark:text-gray-300">{log.changedBy}</span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function PesananDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const numId = Number(id)

    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <BookingDetailContent id={numId} />
            </I18nProvider>
        </DashboardLayout>
    )
}
