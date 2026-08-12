"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    Search, ShoppingBag, Zap, CheckCircle2, X,
    MoreHorizontal, ChevronLeft,
    ChevronRight, Trash2,
    ChevronDown, Check, Timer, BarChart2, History, Calendar,
    Loader2, AlertCircle, Wifi, MapPin, CreditCard,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"
import {
    bulkUpdateBookingStatus,
    fetchAdminBookings,
    type BillingPipelineStatus as PipelineStatus,
} from "@/lib/billing-bookings"
import {
    getSimOrders, addSimNotif,
    nextSimId, saveSimOrder, updateSimOrderPayment,
    type SimOrder,
} from "@/lib/sim-store"
import { formatTooltipDate } from "@/lib/date-utils"
import { SmartPagination } from "@/components/ui/smart-pagination"
import { UserWalletModal } from "@/components/Wallet/UserWalletModal"

// ─── Types ────────────────────────────────────────────────────────────────────
// PipelineStatus comes from the Qurani booking API normalizer.

// ─── Filter Range Tanggal ─────────────────────────────────────────────────────────
type FilterKey =
    | "all"
    | "today" | "yesterday"
    | "this_week" | "this_month" | "this_year" | "last_year"
    | "last_week" | "last_month"
    | "last_7_days" | "last_30_days"

const FILTER_OPTIONS: { key: FilterKey; label: string; group: string }[] = [
    { key: "all",        label: "All (Semua)",  group: "Quick" },
    { key: "today",      label: "Today",        group: "Quick" },
    { key: "yesterday",  label: "Yesterday",    group: "Quick" },
    { key: "this_week",  label: "This week",    group: "Period" },
    { key: "this_month", label: "This month",   group: "Period" },
    { key: "this_year",  label: "This year",    group: "Period" },
    { key: "last_week",  label: "Last week",    group: "Historical" },
    { key: "last_month", label: "Last month",   group: "Historical" },
    { key: "last_year",  label: "Last year",    group: "Historical" },
    { key: "last_7_days",  label: "Last 7 days",  group: "Historical" },
    { key: "last_30_days", label: "Last 30 days", group: "Historical" },
]
const GROUP_ICONS: Record<string, React.ReactNode> = {
    Quick:      <Timer    className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Period:     <BarChart2 className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
    Historical: <History  className="w-3.5 h-3.5 inline-block mr-1 text-gray-400" />,
}

function getDateRange(filter: FilterKey): { from: Date; to: Date } | null {
    if (filter === "all") return null
    const now = new Date()
    const sod = (d: Date) => { d.setHours(0, 0, 0, 0); return d }
    const eod = (d: Date) => { d.setHours(23, 59, 59, 999); return d }
    switch (filter) {
        case "today":      return { from: sod(new Date(now)), to: eod(new Date(now)) }
        case "yesterday":  { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: sod(y), to: eod(new Date(y)) } }
        case "this_week":  { const d = now.getDay(); const m = new Date(now); m.setDate(now.getDate() - (d === 0 ? 6 : d - 1)); return { from: sod(m), to: eod(new Date(now)) } }
        case "this_month": return { from: sod(new Date(now.getFullYear(), now.getMonth(), 1)), to: eod(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
        case "this_year":  return { from: sod(new Date(now.getFullYear(), 0, 1)), to: eod(new Date(now.getFullYear(), 11, 31)) }
        case "last_week":  { const d = now.getDay(); const end = new Date(now); end.setDate(now.getDate() - (d === 0 ? 7 : d)); const start = new Date(end); start.setDate(end.getDate() - 6); return { from: sod(start), to: eod(end) } }
        case "last_month": return { from: sod(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: eod(new Date(now.getFullYear(), now.getMonth(), 0)) }
        case "last_year":  return { from: sod(new Date(now.getFullYear() - 1, 0, 1)), to: eod(new Date(now.getFullYear() - 1, 11, 31)) }
        case "last_7_days":  { const f = new Date(now); f.setDate(now.getDate() - 6);  return { from: sod(f), to: eod(new Date(now)) } }
        case "last_30_days": { const f = new Date(now); f.setDate(now.getDate() - 29); return { from: sod(f), to: eod(new Date(now)) } }
    }
}

function FilterDropdown({ value, onChange }: { value: FilterKey; onChange: (k: FilterKey) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const displayDate = useMemo(() => {
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, "0")
        const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        switch (value) {
            case "all":        return "Semua Data"
            case "today":      return fmt(now)
            case "yesterday":  { const y = new Date(now); y.setDate(y.getDate() - 1); return fmt(y) }
            case "this_week":  { const d = now.getDay(); const m = new Date(now); m.setDate(now.getDate() - (d === 0 ? 6 : d - 1)); const s = new Date(m); s.setDate(m.getDate() + 6); return `${pad(m.getDate())} – ${pad(s.getDate())} ${now.toLocaleDateString("en-US", { month: "short", year: "numeric" })}` }
            case "this_month": return now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
            case "this_year":  return `Year ${now.getFullYear()}`
            case "last_week":  { const d = now.getDay(); const end = new Date(now); end.setDate(now.getDate() - (d === 0 ? 7 : d)); const start = new Date(end); start.setDate(end.getDate() - 6); return `${fmt(start)} – ${fmt(end)}` }
            case "last_month": { const m = new Date(now.getFullYear(), now.getMonth() - 1, 1); return m.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
            case "last_year":  return `Year ${now.getFullYear() - 1}`
            case "last_7_days":  { const f = new Date(now); f.setDate(now.getDate() - 6); return `${fmt(f)} – ${pad(now.getDate())}` }
            case "last_30_days": { const f = new Date(now); f.setDate(now.getDate() - 29); return `${f.toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${fmt(now)}` }
        }
    }, [value])
    useEffect(() => {
        function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener("mousedown", h)
        return () => document.removeEventListener("mousedown", h)
    }, [])
    const groups = ["Quick", "Period", "Historical"]
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-sm"
            >
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-left font-medium text-xs">{displayDate}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1.5">
                    {groups.map((group, gi) => {
                        const items = FILTER_OPTIONS.filter(o => o.group === group)
                        return (
                            <div key={group}>
                                {gi > 0 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3 my-1" />}
                                <div className="px-2">
                                    {items.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => { onChange(opt.key); setOpen(false) }}
                                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${value === opt.key
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                                }`}
                                        >
                                            {opt.label}
                                            {value === opt.key && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

type PipelineOrder = {
    id: string | number
    userId?: string | number
    bookingCode: string
    member: string
    username: string
    memberAvatar: string
    memberImage?: string
    guru: string
    guruUsername: string
    guruImage?: string
    paket: string
    sesi: number
    sesiSelesai: number
    harga: number
    tglPesan: string
    rawDate: Date
    payment: string
    mode: "online" | "offline"
    status: PipelineStatus
    isPendingPayment?: boolean
    isSim?: boolean
    isApi?: boolean
    apiStatus?: number | string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

function toUsername(email: string, name: string) {
    if (email && email.includes("@")) return email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()
    return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

// ─── Mapping booking status → pipeline stage ───────────────────────────────
function getStage(b: typeof dummyData.bookings[0]): PipelineStatus {
    if (b.status === "cancelled") return "gagal"
    if (b.status === "active" && b.completedSessions > 0) return "aktif"
    if (b.status === "completed" || b.status === "active") return "lunas"
    return "baru"
}

// ─── Convert JSON bookings → PipelineOrder ──────────────────────────────────
const AVATAR_COLORS = ["bg-emerald-500", "bg-violet-500", "bg-sky-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-orange-500"]

function bookingToPipeline(b: typeof dummyData.bookings[0]): PipelineOrder {
    const detail = dummyData.bookingDetails.find(d => d.bookingId === b.id)
    const isPendingPayment = detail ? detail.payment.status === "pending" : false
    return {
        id: b.id,
        userId: b.userId || undefined,
        bookingCode: `#${b.id}`,
        member: b.userName,
        username: toUsername(b.userEmail, b.userName),
        memberAvatar: initials(b.userName),
        guru: b.trainerName,
        guruUsername: `@${toUsername("", b.trainerName)}`,
        paket: b.packageName,
        sesi: b.totalSessions,
        sesiSelesai: b.completedSessions,
        harga: b.totalPayment,
        tglPesan: new Date(b.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: b.paymentGateway,
        rawDate: new Date(b.bookingDate),
        status: getStage(b),
        isPendingPayment,
        mode: "online",
    }
}

function simOrderToPipeline(o: SimOrder): PipelineOrder {
    let status: PipelineStatus = "baru"
    if (o.status === "cancelled") status = "gagal"
    else if (o.paymentStatus === "paid" && o.completedSessions > 0) status = "aktif"
    else if (o.paymentStatus === "paid") status = "lunas"
    return {
        id: o.id,
        userId: o.member.id,
        bookingCode: `#${o.id}`,
        member: o.member.name,
        username: toUsername(o.member.email, o.member.name),
        memberAvatar: initials(o.member.name),
        guru: o.trainer.name,
        guruUsername: `@${toUsername(o.trainer.email, o.trainer.name)}`,
        paket: o.pkg.name,
        sesi: o.totalSessions,
        sesiSelesai: o.completedSessions,
        harga: o.pkg.price,
        tglPesan: new Date(o.bookingDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        payment: o.paymentGateway || "—",
        rawDate: new Date(o.bookingDate),
        status,
        isPendingPayment: o.paymentStatus === "pending",
        isSim: true,
        mode: "online",
    }
}

// ─── Table Config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PipelineStatus, { label: string; dotCls: string; badgeCls: string }> = {
    baru:         { label: "Pending",  dotCls: "bg-amber-500",   badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
    lunas:        { label: "Lunas",           dotCls: "bg-emerald-500", badgeCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
    aktif:        { label: "Aktif",           dotCls: "bg-sky-500",     badgeCls: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" },
    gagal:        { label: "Batal",           dotCls: "bg-rose-500",    badgeCls: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" },
    selesai:      { label: "Selesai",         dotCls: "bg-blue-500",    badgeCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
    menunggu_guru:{ label: "Menunggu Guru",   dotCls: "bg-amber-500",   badgeCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
}

const STATUS_ACTIONS: { key: PipelineStatus; label: string; dot: string; text: string; hover: string; border: string }[] = [
    { key: "baru",         label: "Pending",  dot: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400",   hover: "hover:bg-amber-50 dark:hover:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800" },
    { key: "menunggu_guru",label: "Menunggu Guru",   dot: "bg-orange-400",  text: "text-orange-700 dark:text-orange-400", hover: "hover:bg-orange-50 dark:hover:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800" },
    { key: "lunas",        label: "Lunas",           dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400",hover: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",border: "border-emerald-200 dark:border-emerald-800" },
    { key: "aktif",        label: "Aktif",           dot: "bg-sky-500",     text: "text-sky-700 dark:text-sky-400",       hover: "hover:bg-sky-50 dark:hover:bg-sky-900/20",       border: "border-sky-200 dark:border-sky-800" },
    { key: "selesai",      label: "Selesai",         dot: "bg-blue-500",    text: "text-blue-700 dark:text-blue-400",     hover: "hover:bg-blue-50 dark:hover:bg-blue-900/20",     border: "border-blue-200 dark:border-blue-800" },
    { key: "gagal",        label: "Batal",           dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400",     hover: "hover:bg-rose-50 dark:hover:bg-rose-900/20",     border: "border-rose-200 dark:border-rose-800" },
]

// ─── Simulasi Modal ────────────────────────────────────────────────────────────
const SIM_MEMBERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((m: any) => m.id === d.member.id)) acc.push(d.member)
    return acc
}, [] as any[])

const SIM_TRAINERS = dummyData.bookingDetails.reduce((acc, d) => {
    if (!acc.find((t: any) => t.id === d.trainer.id)) acc.push(d.trainer)
    return acc
}, [] as any[])

function SimModal({ onClose, onOrderCreated }: { onClose: () => void; onOrderCreated: () => void }) {
    const [step, setStep] = useState(1)
    const [selMember, setSelMember] = useState<any>(null)
    const [selTrainer, setSelTrainer] = useState<any>(null)
    const [selPkg, setSelPkg] = useState<any>(null)
    const [selGateway, setSelGateway] = useState("")
    const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)
    const [done, setDone] = useState(false)

    const trainerPackages = useMemo(() => {
        if (!selTrainer) return []
        return dummyData.trainerPackages.filter((p: any) => p.trainerId === selTrainer.id)
    }, [selTrainer])

    function handleOrder() {
        if (!selMember || !selTrainer || !selPkg) return
        const id = nextSimId()
        const order: SimOrder = {
            id,
            member: { id: selMember.id, name: selMember.name, email: selMember.email, phone: selMember.phone || "", location: selMember.location || "", joinDate: selMember.joinDate || "" },
            trainer: { id: selTrainer.id, name: selTrainer.name, email: selTrainer.email || "", avatar: selTrainer.avatar || "", rating: selTrainer.rating, totalStudents: selTrainer.totalStudents, specialization: selTrainer.specialization },
            pkg: { key: `${selPkg.sessions}x` as "1x" | "5x" | "10x", name: selPkg.name, sessions: selPkg.sessions, price: selPkg.basePrice, serviceFee: 0 },
            mode: "online",
            paymentGateway: "",
            paymentMethod: "Ummi",
            status: "pending",
            paymentStatus: "pending",
            bookingDate: new Date().toISOString(),
            paidAt: null,
            invoiceNo: `INV-SIM-${id}`,
            completedSessions: 0,
            totalSessions: selPkg.sessions,
            sessions: [],
        }
        saveSimOrder(order)
        setPendingOrderId(id)
        addSimNotif({
            type: "new_order",
            message: "Pesanan Baru — Menunggu Bayar",
            subMessage: `${selMember.name} • ${selPkg.name} • ${selTrainer.name}`,
            isRead: false,
            orderId: id,
        })
        onOrderCreated()
        setStep(4)
    }

    function handlePay() {
        if (!pendingOrderId || !selGateway) return
        updateSimOrderPayment(pendingOrderId, selGateway)
        addSimNotif({
            type: "payment_success",
            message: "Pembayaran Berhasil",
            subMessage: `${selMember?.name} • ${selGateway} • ${formatRupiah((selPkg?.basePrice || 0) + (selPkg?.serviceFee || 0))}`,
            isRead: false,
            orderId: pendingOrderId,
        })
        onOrderCreated()
        setDone(true)
    }

    const stepLabel = ["", "Pilih Member", "Pilih Guru", "Pilih Paket", "Pembayaran"]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Simulasi Pesanan Baru</p>
                    </div>
                    <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Step indicator */}
                {!done && (
                    <div className="flex items-center px-5 pt-4 gap-1">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${s < step ? "bg-emerald-500 text-white" : s === step ? "bg-emerald-600 text-white ring-2 ring-emerald-200" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                    {s < step ? "✓" : s}
                                </div>
                                <p className={`text-[10px] font-medium truncate ${s === step ? "text-emerald-600" : "text-gray-400"}`}>{stepLabel[s]}</p>
                                {s < 4 && <div className={`flex-1 h-px mx-1 ${s < step ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="p-5 space-y-3 min-h-[240px]">
                    {done ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="font-bold text-gray-900 dark:text-white">Pembayaran Berhasil!</p>
                            <p className="text-sm text-gray-500">Pesanan #{pendingOrderId} sudah masuk</p>
                            <button onClick={onClose} className="mt-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">Tutup</button>
                        </div>
                    ) : step === 1 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih member yang memesan:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_MEMBERS.map((m: any) => (
                                    <button key={m.id} onClick={() => setSelMember(m)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selMember?.id === m.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{m.name.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</p>
                                            <p className="text-[11px] text-gray-400">{m.email}</p>
                                        </div>
                                        {selMember?.id === m.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 2 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih guru:</p>
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {SIM_TRAINERS.map((t: any) => (
                                    <button key={t.id} onClick={() => { setSelTrainer(t); setSelPkg(null) }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${selTrainer?.id === t.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        <img src={t.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=10b981&color=fff`} alt={t.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                            <p className="text-[11px] text-gray-400">⭐ {t.rating} · {t.totalStudents} murid</p>
                                        </div>
                                        {selTrainer?.id === t.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : step === 3 ? (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih paket dari {selTrainer?.name}:</p>
                            {trainerPackages.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">Tidak ada paket tersedia</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {trainerPackages.map((p: any) => (
                                        <button key={p.id} onClick={() => setSelPkg(p)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${selPkg?.id === p.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                                <p className="text-[11px] text-gray-400">{p.sessions}x sesi · {p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-emerald-600">{formatRupiah(p.totalPrice)}</p>
                                                {selPkg?.id === p.id && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto mt-1" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selPkg && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-xs space-y-1 border border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">Ringkasan:</p>
                                    <div className="flex justify-between"><span className="text-gray-500">Member</span><span className="font-semibold text-gray-900 dark:text-white">{selMember?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Guru</span><span className="font-semibold text-gray-900 dark:text-white">{selTrainer?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Paket</span><span className="font-semibold text-gray-900 dark:text-white">{selPkg?.name}</span></div>
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">Total</span>
                                        <span className="font-bold text-emerald-600">{formatRupiah(selPkg.totalPrice)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-gray-500 font-medium mb-1">Pilih metode pembayaran:</p>
                            <div className="space-y-1.5">
                                {["GoPay", "QRIS", "OVO"].map(g => (
                                    <button key={g} onClick={() => setSelGateway(g)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${selGateway === g ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                        {g}
                                        {selGateway === g && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </button>
                                ))}
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                ⚠️ Pesanan #{pendingOrderId} sudah masuk. Pilih metode untuk konfirmasi.
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => step > 1 && step < 4 ? setStep(s => s - 1) : onClose()} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                            {step === 1 ? "Batal" : step < 4 ? "← Kembali" : ""}
                        </button>
                        {step === 3 ? (
                            <button onClick={handleOrder} disabled={!selPkg} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Pesan Sekarang <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : step === 4 ? (
                            <button onClick={handlePay} disabled={!selGateway} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Konfirmasi Bayar <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={() => setStep(s => s + 1)} disabled={(step === 1 && !selMember) || (step === 2 && !selTrainer)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors">
                                Lanjut <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}



// ─── Static dummy: Pesanan Selesai — Zulfa Hanum (#3010) ──────────────────────
const ZULFA_COMPLETED_ORDER: PipelineOrder = {
    id: 3010,
    bookingCode: "#3010",
    member: "Zulfa Hanum",
    username: "zulfahanum",
    memberAvatar: "ZH",
    guru: "Hasyim asy'ari, Lc",
    guruUsername: "@hasyim",
    paket: "3x Pertemuan",
    sesi: 3,
    sesiSelesai: 3,
    harga: 250000,
    tglPesan: "10 Jan 2026",
    payment: "GoPay",
    rawDate: new Date("2026-01-10"),
    status: "selesai",
    isSim: true,
    mode: "online",
}

// ─── Static dummy: Pesanan Menunggu Guru — Fauzia Nurrohma (#3098) ─────────────────
const FAUZIA_WAITING_GURU_ORDER: PipelineOrder = {
    id: 3098,
    bookingCode: "#3098",
    member: "Fauzia Nurrohma",
    username: "fauzianurrohma",
    memberAvatar: "FN",
    guru: "Indi Fitriani",
    guruUsername: "@indi.f",
    paket: "1x Pertemuan",
    sesi: 1,
    sesiSelesai: 0,
    harga: 89600,
    tglPesan: "02 Apr 2026",
    payment: "GoPay",
    rawDate: new Date("2026-04-02"),
    status: "menunggu_guru",
    isPendingPayment: false,
    isSim: true,
    mode: "online",
}

// ─── Static dummy: Pesanan Pending — Rahma Aulia (#3099) ──────────────────────
const RAHMA_PENDING_ORDER: PipelineOrder = {
    id: 3099,
    bookingCode: "#3099",
    member: "Rahma Aulia",
    username: "rahmaaulia",
    memberAvatar: "RA",
    guru: "Indi Fitriani",
    guruUsername: "@indi.f",
    paket: "5x Pertemuan",
    sesi: 5,
    sesiSelesai: 0,
    harga: 420000,
    tglPesan: "01 Apr 2026",
    payment: "—",
    rawDate: new Date("2026-04-01"),
    status: "baru",
    isPendingPayment: true,
    isSim: true,
    mode: "online",
}

// ─── Main Content ──────────────────────────────────────────────────────────────
function PesananContent() {
    const router = useRouter()

    // ── Search state — server-side via API Keyword param
    const [searchInput, setSearchInput] = useState("")
    const [search, setSearch] = useState("")
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [dateFilter, setDateFilter] = useState<FilterKey>("this_year")
    const [statusTab, setStatusTab] = useState<"all" | PipelineStatus>("all")
    const [simOrders, setSimOrders] = useState<SimOrder[]>([])
    const [apiOrders, setApiOrders] = useState<PipelineOrder[]>([])
    const [apiLoading, setApiLoading] = useState(true)
    const [apiError, setApiError] = useState<string | null>(null)
    const [showSim, setShowSim] = useState(false)
    const [statusOverrides, setStatusOverrides] = useState<Record<string | number, PipelineStatus>>({})
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([])
    const [openActionId, setOpenActionId] = useState<string | number | null>(null)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    
    // User wallet modal state
    const [selectedWalletUserId, setSelectedWalletUserId] = useState<string | number | null>(null);
    const [selectedWalletUserName, setSelectedWalletUserName] = useState<string>("");

    const refreshSim = useCallback(() => setSimOrders(getSimOrders()), [])

    // ── Server-side search + date filter
    const refreshApi = useCallback((keyword?: string) => {
        setApiLoading(true)
        setApiError(null)
        const range = getDateRange(dateFilter)
        fetchAdminBookings({
            page: 1,
            pageSize: 100,
            ...(range ? { dateFrom: range.from, dateTo: range.to } : {}),
            ...(keyword ? { keyword } : {}),
        })
            .then(rows => setApiOrders(rows as PipelineOrder[]))
            .catch(err => {
                console.error("Failed to fetch bookings:", err)
                setApiOrders([])
                setApiError("API booking belum bisa dimuat, menampilkan data dummy untuk testing.")
            })
            .finally(() => setApiLoading(false))
    }, [dateFilter])

    useEffect(() => {
        refreshApi(search || undefined)
    }, [refreshApi, search])

    useEffect(() => {
        refreshSim()
        window.addEventListener("sim-notif-update", refreshSim)
        return () => window.removeEventListener("sim-notif-update", refreshSim)
    }, [refreshSim])

    // ── Debounced search handler
    function handleSearchChange(val: string) {
        setSearchInput(val)
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = setTimeout(() => {
            setSearch(val)
            setPage(1)
        }, 600)
    }

    function handleSearchSubmit() {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        setSearch(searchInput)
        setPage(1)
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleSearchSubmit()
    }

    async function handleAdvance(id: string | number, next: PipelineStatus) {
        const allOrders = [...apiOrders, FAUZIA_WAITING_GURU_ORDER, RAHMA_PENDING_ORDER, ZULFA_COMPLETED_ORDER, ...simOrders.map(simOrderToPipeline), ...dummyData.bookings.map(bookingToPipeline)]
        const order = allOrders.find(o => String(o.id) === String(id))
        if (!order) return

        const prev = statusOverrides[id] ?? order.status
        setUpdatingStatus(true)

        try {
            if (order.isApi) {
                await bulkUpdateBookingStatus([id], next)
                refreshApi(search || undefined)
            }
            setStatusOverrides(prev2 => ({ ...prev2, [id]: next }))
        } catch (err) {
            console.error("Failed to update booking status:", err)
            setApiError("Gagal mengubah status di API. Status dummy/lokal tidak diubah.")
            return
        } finally {
            setUpdatingStatus(false)
            setOpenActionId(null)
        }

        const numId = typeof id === "number" ? id : parseInt(String(id)) || 0

        const timestamp = new Date().toISOString()
        const logMap: Record<PipelineStatus, string> = {
            lunas: "Pembayaran terkonfirmasi (Lunas).",
            aktif: "Pesanan aktif dan sesi dijadwalkan.",
            gagal: "Pesanan dibatalkan.",
            selesai: "Semua sesi selesai, pesanan ditandai selesai.",
            menunggu_guru: "Menunggu konfirmasi guru.",
            baru: "Pesanan baru."
        }
        const titleMap: Record<PipelineStatus, string> = {
            lunas: "Lunas",
            aktif: "Aktif",
            gagal: "Dibatalkan",
            selesai: "Selesai",
            menunggu_guru: "Menunggu Guru",
            baru: "Pending"
        }
        
        try {
            const key = `sim_audit_trail_${id}`
            const existingStr = localStorage.getItem(key)
            const existing = existingStr ? JSON.parse(existingStr) : []
            const newLog = {
                statusName: titleMap[next] || "Diubah",
                createdAt: timestamp,
                notes: logMap[next] || `Status diubah menjadi ${next}`,
                changedBy: "Admin"
            }
            localStorage.setItem(key, JSON.stringify([newLog, ...existing]))
        } catch (e) {}
    }

    async function handleBulkStatus(next: PipelineStatus) {
        const selected = allOrders.filter(o => selectedIds.some(id => String(id) === String(o.id)))
        if (selected.length === 0) return

        const apiIds = selected.filter(o => o.isApi).map(o => o.id)
        setUpdatingStatus(true)

        try {
            if (apiIds.length > 0) {
                await bulkUpdateBookingStatus(apiIds, next)
                refreshApi(search || undefined)
            }
            setStatusOverrides(prev => {
                const updated = { ...prev }
                selected.forEach(o => { updated[o.id] = next })
                return updated
            })
            
            const timestamp = new Date().toISOString()
            const logMap: Record<PipelineStatus, string> = {
                lunas: "Pembayaran terkonfirmasi (Lunas).",
                aktif: "Pesanan aktif dan sesi dijadwalkan.",
                gagal: "Pesanan dibatalkan.",
                selesai: "Semua sesi selesai, pesanan ditandai selesai.",
                menunggu_guru: "Menunggu konfirmasi guru.",
                baru: "Pesanan baru."
            }
            const titleMap: Record<PipelineStatus, string> = {
                lunas: "Lunas",
                aktif: "Aktif",
                gagal: "Dibatalkan",
                selesai: "Selesai",
                menunggu_guru: "Menunggu Guru",
                baru: "Pending"
            }
            
            selected.forEach(o => {
                try {
                    const key = `sim_audit_trail_${o.id}`
                    const existingStr = localStorage.getItem(key)
                    const existing = existingStr ? JSON.parse(existingStr) : []
                    const newLog = {
                        statusName: titleMap[next] || "Diubah",
                        createdAt: timestamp,
                        notes: logMap[next] || `Status diubah secara bulk menjadi ${next}`,
                        changedBy: "Admin"
                    }
                    localStorage.setItem(key, JSON.stringify([newLog, ...existing]))
                } catch (e) {}
            })

            setSelectedIds([])
            setBulkOpen(false)
        } catch (err) {
            console.error("Failed to bulk update booking status:", err)
            setApiError("Bulk status gagal dikirim ke API.")
        } finally {
            setUpdatingStatus(false)
        }
    }

    const allOrders = useMemo<PipelineOrder[]>(() => {
        const simRows = simOrders.map(simOrderToPipeline)
        const staticRows = dummyData.bookings.map(bookingToPipeline)
        const combined = [...apiOrders, FAUZIA_WAITING_GURU_ORDER, RAHMA_PENDING_ORDER, ZULFA_COMPLETED_ORDER, ...simRows, ...staticRows]
        const seen = new Set<string>()
        return combined
            .filter(o => {
                const key = String(o.id)
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
            .map(o => statusOverrides[o.id] ? { ...o, status: statusOverrides[o.id] } : o)
            .filter(o => o.member !== "Ahmad Fauzi")
    }, [apiOrders, simOrders, statusOverrides])

    // ── Client-side filtering: date range + status tab (search already applied server-side)
    const filtered = useMemo(() => {
        const range = getDateRange(dateFilter)
        return allOrders.filter(o => {
            // For API orders, date filtering already done server-side; apply locally for dummy data only
            if (!o.isApi && range !== null) {
                const inRange = o.rawDate >= range.from && o.rawDate <= range.to
                if (!inRange) return false
            }
            if (statusTab !== "all") {
                if (statusTab === "baru") {
                    if (o.status !== "baru" && o.status !== "menunggu_guru") return false
                } else {
                    if (o.status !== statusTab) return false
                }
            }
            // For non-API orders, also apply client-side keyword search
            if (!o.isApi && search) {
                const q = search.toLowerCase()
                return (
                    o.member.toLowerCase().includes(q) ||
                    o.guru.toLowerCase().includes(q) ||
                    String(o.id).includes(q) ||
                    o.paket.toLowerCase().includes(q) ||
                    o.username.includes(q)
                )
            }
            return true
        })
    }, [allOrders, dateFilter, statusTab, search])

    const dateFiltered = useMemo(() => {
        const range = getDateRange(dateFilter)
        return allOrders.filter(o => {
            if (!o.isApi && range !== null) {
                const inRange = o.rawDate >= range.from && o.rawDate <= range.to
                if (!inRange) return false
            }
            return true
        })
    }, [allOrders, dateFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
    const pagedIds = paged.map(o => o.id)
    const allPagedSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.some(selected => String(selected) === String(id)))

    function toggleSelected(id: string | number) {
        setSelectedIds(prev => prev.some(selected => String(selected) === String(id))
            ? prev.filter(selected => String(selected) !== String(id))
            : [...prev, id]
        )
    }

    function togglePagedSelected() {
        if (allPagedSelected) {
            setSelectedIds(prev => prev.filter(id => !pagedIds.some(pagedId => String(pagedId) === String(id))))
            return
        }
        setSelectedIds(prev => {
            const next = [...prev]
            pagedIds.forEach(id => {
                if (!next.some(selected => String(selected) === String(id))) next.push(id)
            })
            return next
        })
    }

    function handleResetSim() {
        import("@/lib/sim-store").then(m => { m.clearSimOrders(); setSimOrders([]) })
        setStatusOverrides({})
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-5">

            <div className="max-w-[1600px] mx-auto">
                {/* ── Page Header ── */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pesanan</h1>
                </div>

                {/* ── Action Toolbar ── */}
                <div className="flex items-center gap-4 mb-6">
                    {/* Search & Filter Container */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm flex items-center gap-3 flex-1 max-w-[calc(100%-180px)]">
                        <div className="relative group flex-1 max-w-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                            {apiLoading && search && (
                                <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 animate-spin" />
                            )}
                            <input
                                type="text"
                                placeholder="Cari member, guru, paket, kode pesanan..."
                                value={searchInput}
                                onChange={e => handleSearchChange(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="w-full pl-11 pr-24 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                            />
                            <button
                                onClick={handleSearchSubmit}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center gap-2 text-xs font-bold transition-all cursor-pointer border border-gray-200 dark:border-gray-600 shadow-sm"
                            >
                                <Search className="w-3.5 h-3.5" />
                                Cari
                            </button>
                        </div>
                        <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-1" />
                        
                        <button
                            onClick={() => setBulkOpen(o => !o)}
                            disabled={selectedIds.length === 0 || updatingStatus}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                                selectedIds.length > 0 
                                ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-emerald-400 cursor-pointer" 
                                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed opacity-60"
                            }`}
                        >
                            Bulk Status
                            {selectedIds.length > 0 && <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] ml-1">{selectedIds.length}</span>}
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-1" />
                        <FilterDropdown value={dateFilter} onChange={k => { setDateFilter(k); setPage(1) }} />
                    </div>

                    {/* Simulation Tools Container */}
                    <div className="flex items-center gap-2.5 ml-auto">
                        {simOrders.length > 0 && (
                            <button onClick={handleResetSim}
                                className="flex items-center justify-center w-[46px] h-[46px] rounded-xl border border-red-100 bg-white dark:bg-gray-900 text-red-500 hover:bg-red-50 transition-all cursor-pointer shadow-sm group">
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                        )}
                        
                        <button onClick={() => setShowSim(true)}
                            title="Simulasi pesanan untuk testing"
                            className="flex items-center justify-center w-[48px] h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none transition-all cursor-pointer group">
                            <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* ── API Loading / Error Toast ── */}
                {(apiLoading || apiError) && (
                    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
                        {apiLoading && (
                            <div className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-xl shadow-black/10 animate-in slide-in-from-bottom-3 fade-in duration-300">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800 dark:text-white">Memuat pesanan...</p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {search ? `Mencari "${search}" via API Qurani` : "Mengambil data dari API Qurani"}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!apiLoading && apiError && (
                            <div className="pointer-events-auto flex items-center gap-3 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 shadow-xl shadow-black/10 animate-in slide-in-from-bottom-3 fade-in duration-300">
                                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">API tidak tersedia</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Menampilkan data lokal</p>
                                </div>
                                <button
                                    onClick={() => setApiError(null)}
                                    className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Status Tabs ── */}
                <div className="flex items-center gap-6 border-b border-gray-100 dark:border-gray-800 mb-0">
                    {([
                        { key: "all",     label: "Semua",   count: dateFiltered.length,                                                                              activeText: "text-emerald-600 dark:text-emerald-400", activeBorder: "border-emerald-500", activeCount: "text-emerald-500" },
                        { key: "lunas",   label: "Lunas",   count: dateFiltered.filter(o => o.status === "lunas").length,                                             activeText: "text-emerald-600 dark:text-emerald-400", activeBorder: "border-emerald-500", activeCount: "text-emerald-500" },
                        { key: "aktif",   label: "Aktif",   count: dateFiltered.filter(o => o.status === "aktif").length,                                             activeText: "text-sky-600 dark:text-sky-400",         activeBorder: "border-sky-500",     activeCount: "text-sky-500"     },
                        { key: "baru",    label: "Pending", count: dateFiltered.filter(o => o.status === "baru" || o.status === "menunggu_guru").length,               activeText: "text-amber-600 dark:text-amber-400",     activeBorder: "border-amber-500",   activeCount: "text-amber-500"   },
                        { key: "gagal",   label: "Batal",   count: dateFiltered.filter(o => o.status === "gagal").length,                                             activeText: "text-rose-600 dark:text-rose-400",       activeBorder: "border-rose-500",    activeCount: "text-rose-500"    },
                        { key: "selesai", label: "Selesai", count: dateFiltered.filter(o => o.status === "selesai").length,                                           activeText: "text-blue-600 dark:text-blue-400",       activeBorder: "border-blue-500",    activeCount: "text-blue-500"    },
                    ] as { key: "all" | PipelineStatus; label: string; count: number; activeText: string; activeBorder: string; activeCount: string }[]).map(tab => (
                        <button key={tab.key} onClick={() => { setStatusTab(tab.key); setPage(1) }}
                            className={`cursor-pointer flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${statusTab === tab.key
                                ? `${tab.activeBorder} ${tab.activeText}`
                                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            }`}>
                            {tab.label}
                            <span className={`text-xs font-bold ${statusTab === tab.key ? tab.activeCount : "text-gray-400"}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {/* ── Table List ── */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="w-10 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={allPagedSelected}
                                            onChange={togglePagedSelected}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Kode Pesanan</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Murid</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Guru</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Paket</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Mode</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Tanggal</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Harga</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-800 dark:text-gray-200 px-4 py-3 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-16 text-gray-400 dark:text-gray-500">
                                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>{search ? `Tidak ada pesanan untuk "${search}"` : "Tidak ada pesanan ditemukan"}</p>
                                        </td>
                                    </tr>
                                ) : paged.map(order => {
                                    const colorIdx = Math.abs(order.member.charCodeAt(0) + (order.member.charCodeAt(1) || 0)) % AVATAR_COLORS.length
                                    const st = STATUS_CONFIG[order.status]
                                    const isSelected = selectedIds.some(id => String(id) === String(order.id))
                                    return (
                                    <tr
                                        key={order.id}
                                        onClick={() => router.push(`/billing/orders/${order.id}`)}
                                        className={`${isSelected ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer`}
                                    >
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelected(order.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </td>
                                            {/* Kode Pesanan */}
                                            <td className="px-4 py-3 w-auto" onClick={e => e.stopPropagation()}>
                                                <div className="flex flex-col gap-0.5 items-start">
                                                    <span
                                                        onClick={() => router.push(`/billing/orders/${order.id}`)}
                                                        className="inline-flex w-fit items-center font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800 whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors"
                                                    >
                                                        {order.bookingCode}
                                                    </span>
                                                    {order.isApi && (
                                                        <span className="text-[9px] font-medium text-emerald-500 dark:text-emerald-400 pl-1">API</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Member */}
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (order.userId) {
                                                            setSelectedWalletUserId(order.userId);
                                                            setSelectedWalletUserName(order.member);
                                                        }
                                                    }} className={`text-sm font-semibold text-gray-900 dark:text-white ${order.userId ? 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer' : ''}`}>{order.member}</p>
                                                    <p className="text-[11px] text-gray-500">{order.username}</p>
                                                </div>
                                            </td>
                                            {/* Guru */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {order.guruImage ? (
                                                        <img src={order.guruImage} alt={order.guru} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                                                    ) : null}
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.guru}</p>
                                                        <p className="text-[11px] text-gray-500">{order.guruUsername}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Paket */}
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.paket}</p>
                                                <p className="text-[11px] text-gray-500">{order.sesiSelesai}/{order.sesi} Sesi</p>
                                            </td>
                                            {/* Mode (online/offline) */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                                                    order.mode === "offline" 
                                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" 
                                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${order.mode === "offline" ? "bg-purple-500" : "bg-blue-500"}`} />
                                                    {order.mode === "offline" ? "Tatap Muka" : "Online"}
                                                </span>
                                            </td>
                                            {/* Tanggal */}
                                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                <span title={formatTooltipDate(order.rawDate)}>{order.tglPesan}</span>
                                            </td>
                                            {/* Harga */}
                                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatRupiah(order.harga)}</td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.badgeCls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls} inline-block`} />
                                                    {st.label}
                                                </span>
                                            </td>
                                            {/* Aksi */}
                                            <td className="px-4 py-3 relative">
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation()
                                                        setOpenActionId(openActionId === order.id ? null : order.id)
                                                    }}
                                                    disabled={updatingStatus}
                                                    className="flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 transition-colors opacity-60 group-hover:opacity-100"
                                                >
                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                </button>
                                                {openActionId === order.id && (
                                                    <div
                                                        onClick={e => e.stopPropagation()}
                                                        className="absolute right-4 top-10 z-40 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl py-1.5 overflow-hidden"
                                                    >
                                                        <button
                                                            onClick={() => router.push(`/billing/orders/${order.id}`)}
                                                            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                                            Lihat Detail
                                                        </button>
                                                        <div className="my-1 h-px bg-gray-100 dark:bg-gray-800 mx-3" />
                                                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubah Status</div>
                                                        {STATUS_ACTIONS.map(action => (
                                                            <button
                                                                key={action.key}
                                                                onClick={() => handleAdvance(order.id, action.key)}
                                                                className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center gap-2 ${action.text} ${action.hover} transition-colors`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${action.dot} flex-shrink-0`} />
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination ── */}
                    <SmartPagination
                        total={filtered.length}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
                        loading={apiLoading}
                    />
                </div>
            </div>

            {showSim && <SimModal onClose={() => setShowSim(false)} onOrderCreated={refreshSim} />}

            {/* ── Bulk Status Modal ── */}
            {bulkOpen && selectedIds.length > 0 && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={() => setBulkOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">Ubah Status Massal</p>
                                <p className="text-xs text-gray-500 mt-0.5">{selectedIds.length} pesanan dipilih</p>
                            </div>
                            <button onClick={() => setBulkOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-2">
                            {STATUS_ACTIONS.map(action => (
                                <button
                                    key={action.key}
                                    onClick={() => handleBulkStatus(action.key)}
                                    disabled={updatingStatus}
                                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all disabled:opacity-50 ${action.border} ${action.text} ${action.hover}`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${action.dot}`} />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                        <div className="px-4 pb-4">
                            <button
                                onClick={() => { setSelectedIds([]); setBulkOpen(false) }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            >
                                Batal &amp; Hapus Pilihan
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* User Wallet Modal */}
            {selectedWalletUserId && (
                <UserWalletModal
                    onClose={() => {
                        setSelectedWalletUserId(null);
                        setSelectedWalletUserName("");
                    }}
                    userId={selectedWalletUserId}
                    userName={selectedWalletUserName}
                />
            )}
        </div>
    )
}

export default function PesananPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <PesananContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
