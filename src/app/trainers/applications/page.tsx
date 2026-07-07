"use client"

import { useState, useMemo, useEffect, useCallback, Suspense } from "react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import Link from "next/link"
import {
    Search, ChevronLeft, ChevronRight, Users,
    ChevronsUpDown, Eye, ClipboardList, XCircle, CheckCircle2,
    Calendar, Clock, Video, MapPin, Sparkles, AlertTriangle, RefreshCw, Info, Loader2
} from "lucide-react"
import { ToastContainer, showToast } from "@/components/ui/toast-sim"
import pendingDummies from "@/data/pending-trainers-list.json"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDistanceToNowStrict } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { resolveUserTimezone } from "@/lib/date-utils"

// ---------- Status Types ----------
type PengajuanStatus = "pending" | "seleksi" | "diterima" | "ditolak" | "batal"
type FilterStatus = PengajuanStatus | "all"

const STATUS_CFG: Record<PengajuanStatus, { label: string; bg: string; text: string; dot: string }> = {
    pending:  { label: "Menunggu",  bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-700 dark:text-amber-400",   dot: "bg-amber-500"  },
    seleksi:  { label: "Seleksi",   bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-700 dark:text-blue-400",     dot: "bg-blue-500"   },
    diterima: { label: "Diterima",  bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    ditolak:  { label: "Ditolak",   bg: "bg-rose-100 dark:bg-rose-900/30",     text: "text-rose-700 dark:text-rose-400",     dot: "bg-rose-500"   },
    batal:    { label: "Batal",     bg: "bg-gray-100 dark:bg-gray-800",        text: "text-gray-500 dark:text-gray-400",     dot: "bg-gray-400"   },
}

// ---------- Session keys ----------
const SELEKSI_KEY    = "pengajuanGuruSeleksi"
const PENILAIAN_KEY  = "pengajuanGuruPenilaian"
const STATUS_KEY     = "pengajuanGuruStatuses"
const RESCHEDULE_KEY = "pengajuanGuruReschedule"

function getSession<T>(key: string): T | null {
    try {
        const s = sessionStorage.getItem(key)
        return s ? JSON.parse(s) : null
    } catch { return null }
}
function setSession(key: string, val: unknown) {
    try { sessionStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ---------- Date Helpers ----------
function formatDateRelative(dateStr: string) {
    try {
        return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true, locale: idLocale })
    } catch { return dateStr }
}
function formatDateFull(dateStr: string) {
    try {
        const tz = resolveUserTimezone()
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
            timeZone: tz, timeZoneName: "short",
        }).format(new Date(dateStr))
    } catch { return dateStr }
}

// ---------- Sub-components ----------
function StatusBadge({ status }: { status: PengajuanStatus }) {
    const cfg = STATUS_CFG[status]
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    )
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <button onClick={() => onChange(Math.max(1, value - 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold">−</button>
                <span className={`w-8 text-center text-sm font-bold ${value >= 7 ? "text-emerald-600" : value >= 4 ? "text-amber-600" : "text-rose-600"}`}>{value}</span>
                <button onClick={() => onChange(Math.min(9, value + 1))} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-bold">+</button>
            </div>
        </div>
    )
}

const PAGE_SIZE = 10

function getClientToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        const stored = localStorage.getItem("myqurani_auth")
        if (stored) {
            const auth = JSON.parse(stored)
            return auth.accessToken || null
        }
    } catch { return null }
    return null
}

function mapPendingTrainer(d: any) {
    return {
        id: d.id,
        name: d.userName || d.name || `Guru #${d.id}`,
        email: d.email || "",
        username: d.username || d.userUsername || "",
        specialization: d.headline || d.expertise?.join?.(" | ") || "Pengajar Al-Qur'an",
        location: d.location || "",
        teachingMethod: d.isOnline && d.isOffline ? "Online / Offline" : d.isOnline ? "Online" : "Offline",
        createdAtRaw: d.createdAt || d.appliedAt || new Date().toISOString(),
    }
}

function PengajuanContent() {
    // ---------- Data (from API) ----------
    const [guruList, setGuruList] = useState<any[]>([])
    const [isFetchingList, setIsFetchingList] = useState(true)
    const [fetchError, setFetchError] = useState<string | null>(null)

    const fetchPending = useCallback(async () => {
        setIsFetchingList(true)
        setFetchError(null)
        try {
            const token = getClientToken()
            const API_BASE_URL = process.env.NEXT_PUBLIC_MYQURANI_API_URL || "https://api.myqurani.com"
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
            const res = await fetch(`${API_BASE_URL}/api/v1/Trainers/pending`, { headers })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            const raw: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
            setGuruList(raw.map(mapPendingTrainer))
        } catch (err: any) {
            console.warn("[PengajuanGuru] fetch error, using dummy fallback:", err.message)
            setFetchError(null)
            // Fallback to dummy data on error
            setGuruList(pendingDummies.map(mapPendingTrainer))
        } finally {
            setIsFetchingList(false)
        }
    }, [])

    useEffect(() => { fetchPending() }, [fetchPending])

    const [statuses, setStatuses]           = useState<Record<number, PengajuanStatus>>({})
    const [seleksiData, setSeleksiData]     = useState<Record<number, any>>({})
    const [penilaianData, setPenilaianData] = useState<Record<number, any>>({})
    const [rescheduleFlags, setRescheduleFlags] = useState<Record<number, boolean>>({})

    useEffect(() => {
        const s   = getSession<Record<number, PengajuanStatus>>(STATUS_KEY)
        const sel = getSession<Record<number, any>>(SELEKSI_KEY)
        const pen = getSession<Record<number, any>>(PENILAIAN_KEY)
        const res = getSession<Record<number, boolean>>(RESCHEDULE_KEY)
        if (s)   setStatuses(s)
        if (sel) setSeleksiData(sel)
        if (pen) setPenilaianData(pen)
        if (res) setRescheduleFlags(res)
    }, [])

    const updateStatus = (id: number, status: PengajuanStatus) => {
        setStatuses(prev => {
            const updated = { ...prev, [id]: status }
            setSession(STATUS_KEY, updated)
            return updated
        })
    }

    // ---------- Modal: Seleksi ----------
    const [seleksiModal, setSeleksiModal] = useState<{
        open: boolean; guruId: number | null; name: string; location: string; isReschedule: boolean
    }>({ open: false, guruId: null, name: "", location: "", isReschedule: false })

    const [sDate, setSDate]       = useState("")
    const [sTime, setSTime]       = useState("")
    const [sMethod, setSMethod]   = useState<"online" | "offline">("online")
    const [sLink, setSLink]       = useState("")
    const [sPenguji, setSPenguji] = useState("")
    const [sNotes, setSNotes]     = useState("")

    // Pre-fill form dengan data yang sudah ada (untuk Edit Jadwal & Reschedule)
    const openSeleksiModal = (guru: any, isReschedule = false) => {
        const existing = seleksiData[guru.id]
        setSeleksiModal({ open: true, guruId: guru.id, name: guru.name, location: guru.location || "", isReschedule })
        if (existing) {
            setSDate(existing.date || "")
            setSTime(existing.time || "")
            setSMethod(existing.method || "online")
            setSLink(existing.link || "")
            setSPenguji(existing.penguji || "")
            setSNotes(existing.notes || "")
        } else {
            setSDate(""); setSTime(""); setSLink(""); setSPenguji(""); setSNotes("")
            setSMethod("online")
        }
    }

    const closeSeleksiModal = () =>
        setSeleksiModal({ open: false, guruId: null, name: "", location: "", isReschedule: false })

    const handleSubmitSeleksi = (e: React.FormEvent) => {
        e.preventDefault()
        if (!seleksiModal.guruId) return
        const data = { date: sDate, time: sTime, method: sMethod, link: sLink, penguji: sPenguji, notes: sNotes }

        setSeleksiData(prev => {
            const updated = { ...prev, [seleksiModal.guruId!]: data }
            setSession(SELEKSI_KEY, updated)
            return updated
        })

        // Reset reschedule flag setelah jadwal baru tersimpan
        setRescheduleFlags(prev => {
            const updated = { ...prev, [seleksiModal.guruId!]: false }
            setSession(RESCHEDULE_KEY, updated)
            return updated
        })

        updateStatus(seleksiModal.guruId, "seleksi")

        const isEdit = seleksiModal.isReschedule
        showToast({
            type: "success",
            title: isEdit ? "Jadwal Berhasil Diperbarui" : "Jadwal Seleksi Dikirim",
            message: isEdit
                ? `Email jadwal baru dikirim ke ${seleksiModal.name}.`
                : `Email undangan dikirim ke ${seleksiModal.name}. Status: Seleksi.`,
            endpoint: `POST /api/v1/Trainers/${seleksiModal.guruId}/schedule-selection`,
        })
        closeSeleksiModal()
    }

    // ---------- Modal: Penilaian ----------
    const [penilaianModal, setPenilaianModal] = useState<{ open: boolean; guruId: number | null; name: string }>({ open: false, guruId: null, name: "" })
    const [pHadir, setPHadir]           = useState<"hadir" | "tidak_hadir" | null>(null)
    const [pFluency, setPFluency]       = useState(5)
    const [pTajweed, setPTajweed]       = useState(5)
    const [pIntonation, setPIntonation] = useState(5)
    const [pAppearance, setPAppearance] = useState(5)
    const [pExperience, setPExperience] = useState(5)

    const openPenilaianModal = (guru: any) => {
        setPenilaianModal({ open: true, guruId: guru.id, name: guru.name })
        setPHadir(null); setPFluency(5); setPTajweed(5); setPIntonation(5); setPAppearance(5); setPExperience(5)
    }

    const handleSubmitPenilaian = (decision: "diterima" | "ditolak") => {
        if (!penilaianModal.guruId) return
        if (!pHadir) { showToast({ type: "error", title: "Pilih Status Kehadiran", message: "Harap pilih status kehadiran dahulu." }); return }
        const data = { hadir: pHadir, scores: { fluency: pFluency, tajweed: pTajweed, intonation: pIntonation, appearance: pAppearance, experience: pExperience }, decision }
        setPenilaianData(prev => {
            const updated = { ...prev, [penilaianModal.guruId!]: data }
            setSession(PENILAIAN_KEY, updated)
            return updated
        })
        updateStatus(penilaianModal.guruId, decision)
        showToast({
            type: decision === "diterima" ? "success" : "info",
            title: decision === "diterima" ? "Guru Berhasil Diterima" : "Guru Ditolak",
            message: penilaianModal.name,
            endpoint: `POST /api/v1/Trainers/${penilaianModal.guruId}/grade-selection`,
        })
        setPenilaianModal({ open: false, guruId: null, name: "" })
    }

    // ---------- Filters ----------
    const [search, setSearch]           = useState("")
    const [searchInput, setSearchInput] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending")
    const [page, setPage] = useState(1)

    const effective = useMemo(() =>
        guruList.map(g => ({ ...g, status: (statuses[g.id] ?? "pending") as PengajuanStatus })),
        [guruList, statuses]
    )

    const counts: Record<FilterStatus, number> = useMemo(() => {
        const c: Record<FilterStatus, number> = { all: effective.length, pending: 0, seleksi: 0, diterima: 0, ditolak: 0, batal: 0 }
        effective.forEach(g => { c[g.status as FilterStatus] = (c[g.status as FilterStatus] ?? 0) + 1 })
        return c
    }, [effective])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return effective.filter(g => {
            const matchSearch = !q || g.name.toLowerCase().includes(q) || g.specialization.toLowerCase().includes(q) || g.email.toLowerCase().includes(q)
            const matchStatus = statusFilter === "all" || g.status === statusFilter
            return matchSearch && matchStatus
        })
    }, [effective, search, statusFilter])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const TABS: { key: FilterStatus; label: string; color: string }[] = [
        { key: "pending",  label: "Menunggu", color: "amber"   },
        { key: "seleksi",  label: "Seleksi",  color: "blue"    },
        { key: "diterima", label: "Diterima", color: "emerald" },
        { key: "ditolak",  label: "Ditolak",  color: "rose"    },
        { key: "batal",    label: "Batal",    color: "gray"    },
        { key: "all",      label: "Semua",    color: "slate"   },
    ]

    const tabColorMap: Record<string, { active: string; inactive: string }> = {
        amber:   { active: "bg-amber-500 text-white border-amber-500",   inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-amber-400" },
        blue:    { active: "bg-blue-500 text-white border-blue-500",     inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400" },
        emerald: { active: "bg-emerald-500 text-white border-emerald-500", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-400" },
        rose:    { active: "bg-rose-500 text-white border-rose-500",     inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-rose-400" },
        gray:    { active: "bg-gray-500 text-white border-gray-500",     inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400" },
        slate:   { active: "bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900", inactive: "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
    }

    return (
        <TooltipProvider>
        <div className="bg-gray-50 dark:bg-gray-950 p-4 min-h-screen">
            <ToastContainer />
            <div className="max-w-[1600px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengajuan Guru</h1>
                    <button onClick={fetchPending} disabled={isFetchingList}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingList ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </div>

                {/* Loading state */}
                {isFetchingList ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data pengajuan guru dari API...</p>
                    </div>
                ) : fetchError ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                        <AlertTriangle className="w-10 h-10 text-amber-400" />
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">Gagal memuat data</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fetchError}</p>
                        </div>
                        <button onClick={fetchPending} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg">Coba Lagi</button>
                    </div>
                ) : (
                <>

                {/* Tabs filter + Search */}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {TABS.map(t => {
                            const isActive = statusFilter === t.key
                            const colors = tabColorMap[t.color]
                            return (
                                <button key={t.key}
                                    onClick={() => { setStatusFilter(t.key); setPage(1) }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${isActive ? colors.active : colors.inactive}`}>
                                    {t.key === "all" && <Sparkles className="w-3 h-3" />}
                                    {t.label}
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/25" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                        {counts[t.key]}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative flex w-full lg:w-[22rem]">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1) } }}
                                placeholder="Cari nama atau email..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" />
                        </div>
                        <button onClick={() => { setSearch(searchInput); setPage(1) }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-r-lg border border-emerald-500 transition-colors flex items-center gap-1.5">
                            <Search className="w-4 h-4" /> Cari
                        </button>
                    </div>
                </div>

                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Pendaftar</th>
                                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Spesialisasi</th>
                                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Tgl Daftar</th>
                                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Status</th>
                                    <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-300 px-4 py-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paged.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-gray-400">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p>Tidak ada data pengajuan</p>
                                        </td>
                                    </tr>
                                ) : paged.map(guru => (
                                    <tr key={guru.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                                                    {guru.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-xs leading-tight">{guru.name}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">@{guru.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs italic font-semibold text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                            {guru.specialization}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px whitespace-nowrap">
                                                        {formatDateRelative(guru.createdAtRaw)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p className="text-xs">{formatDateFull(guru.createdAtRaw)}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge status={guru.status} />
                                                {guru.status === "seleksi" && rescheduleFlags[guru.id] && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                        <RefreshCw className="w-2.5 h-2.5" /> Reschedule
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity flex-wrap">
                                                {(guru.status === "pending" || guru.status === "seleksi") && (
                                                    <Link href={`/billing/guru/${guru.id}/review`}
                                                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg transition-colors">
                                                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                                                    </Link>
                                                )}
                                                {guru.status === "ditolak" && (
                                                    <Link href={`/billing/guru/${guru.id}/review`}
                                                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg transition-colors">
                                                        <Eye className="w-3.5 h-3.5" /> Lihat Alasan
                                                    </Link>
                                                )}
                                                {guru.status === "seleksi" && (
                                                    rescheduleFlags[guru.id] ? (
                                                        <button onClick={() => openSeleksiModal(guru, true)}
                                                            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg transition-colors">
                                                            <RefreshCw className="w-3.5 h-3.5" /> Atur Ulang
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => openSeleksiModal(guru)}
                                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                                                            <Calendar className="w-3.5 h-3.5" /> Edit Jadwal
                                                        </button>
                                                    )
                                                )}
                                                {guru.status === "seleksi" && (
                                                    <button onClick={() => openPenilaianModal(guru)}
                                                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-lg transition-colors">
                                                        <ClipboardList className="w-3.5 h-3.5" /> Penilaian
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Mobile Card Layout ── */}
                <div className="block md:hidden space-y-3">
                    {paged.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm text-gray-400">Tidak ada data pengajuan</p>
                        </div>
                    ) : paged.map(guru => (
                        <div key={guru.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 shadow-sm">
                            {/* Header: Avatar + Nama + Status */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                                        {guru.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{guru.name}</p>
                                        <p className="text-[11px] text-gray-400 truncate">@{guru.username}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <StatusBadge status={guru.status} />
                                    {guru.status === "seleksi" && rescheduleFlags[guru.id] && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                            <RefreshCw className="w-2.5 h-2.5" /> Reschedule
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Detail: Spesialisasi + Tanggal */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Spesialisasi</p>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{guru.specialization}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5">Tgl Daftar</p>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="cursor-help border-b border-dashed border-gray-400 dark:border-gray-500 pb-px font-semibold text-gray-700 dark:text-gray-300">
                                                {formatDateRelative(guru.createdAtRaw)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <p className="text-xs">{formatDateFull(guru.createdAtRaw)}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            {/* Aksi */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                {(guru.status === "pending" || guru.status === "seleksi") && (
                                    <Link href={`/billing/guru/${guru.id}/review`}
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                                    </Link>
                                )}
                                {guru.status === "ditolak" && (
                                    <Link href={`/billing/guru/${guru.id}/review`}
                                        className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <Eye className="w-3.5 h-3.5" /> Lihat Alasan
                                    </Link>
                                )}
                                {guru.status === "seleksi" && (
                                    rescheduleFlags[guru.id] ? (
                                        <button onClick={() => openSeleksiModal(guru, true)}
                                            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                            <RefreshCw className="w-3.5 h-3.5" /> Atur Ulang
                                        </button>
                                    ) : (
                                        <button onClick={() => openSeleksiModal(guru)}
                                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                            <Calendar className="w-3.5 h-3.5" /> Edit Jadwal
                                        </button>
                                    )
                                )}
                                {guru.status === "seleksi" && (
                                    <button onClick={() => openPenilaianModal(guru)}
                                        className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-semibold border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                        <ClipboardList className="w-3.5 h-3.5" /> Penilaian
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Pagination (shared) ── */}
                <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">
                        Menampilkan {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length} data
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)}
                                className={`min-w-[32px] h-8 rounded-lg text-xs font-medium border transition-colors ${p === page ? "bg-emerald-500 text-white border-emerald-500" : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                {p}
                            </button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
                </>
                )}
            </div>

            {/* ─── Modal: Jadwal Seleksi / Atur Ulang ──────────────────────── */}
            {seleksiModal.open && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                        {/* Header — berubah warna sesuai mode (normal / reschedule) */}
                        <div className={`flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl ${seleksiModal.isReschedule ? "bg-amber-50 dark:bg-amber-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {seleksiModal.isReschedule
                                        ? <><RefreshCw className="w-5 h-5 text-amber-500" /> Atur Ulang Jadwal Seleksi</>
                                        : <><Calendar className="w-5 h-5 text-blue-500" /> Jadwal Wawancara Seleksi</>
                                    }
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Untuk: <span className={`font-bold ${seleksiModal.isReschedule ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>{seleksiModal.name}</span>
                                </p>
                            </div>
                            <button onClick={closeSeleksiModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-4">
                            <form id="formSeleksi" onSubmit={handleSubmitSeleksi} className="space-y-4">

                                {/* Banner reschedule */}
                                {seleksiModal.isReschedule && (
                                    <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Permintaan Reschedule</p>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                                                Guru mengajukan reschedule. Jadwal lama ditampilkan — silakan ubah ke waktu yang baru lalu kirim ulang.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Tanggal Seleksi</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="date" value={sDate} onChange={e => setSDate(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Jam Seleksi</label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="time" value={sTime} onChange={e => setSTime(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Metode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setSMethod("online")}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "online" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                                            <Video className="w-4 h-4" /> Online
                                        </button>
                                        <button type="button" onClick={() => setSMethod("offline")}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${sMethod === "offline" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}>
                                            <MapPin className="w-4 h-4" /> Offline
                                        </button>
                                    </div>
                                </div>

                                {sMethod === "online" ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Link Pertemuan (Zoom / Google Meet)</label>
                                        <div className="relative">
                                            <Video className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="url" value={sLink} onChange={e => setSLink(e.target.value)} placeholder="https://meet.google.com/..."
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Lokasi / Alamat</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                            <input required type="text" value={sLink} onChange={e => setSLink(e.target.value)}
                                                placeholder={seleksiModal.location || "Jl. Contoh No. 1, Kota..."}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">Lokasi pendaftar: <span className="font-semibold">{seleksiModal.location || "-"}</span></p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Penguji / Tim Penyeleksi</label>
                                    <input required type="text" value={sPenguji} onChange={e => setSPenguji(e.target.value)} placeholder="Ustadz Hamid, Tim Qurani"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5">Catatan / Info Tambahan</label>
                                    <textarea value={sNotes} onChange={e => setSNotes(e.target.value)} rows={3}
                                        placeholder="Persiapkan hafalan surah pendek, bawa dokumen asli..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                </div>
                            </form>
                        </div>

                        <div className="flex justify-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={closeSeleksiModal}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 transition-colors">
                                Batal
                            </button>
                            <button type="submit" form="formSeleksi"
                                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 ${seleksiModal.isReschedule ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-500 hover:bg-blue-600"}`}>
                                {seleksiModal.isReschedule
                                    ? <><RefreshCw className="w-4 h-4" /> Simpan Jadwal Baru</>
                                    : <><Calendar className="w-4 h-4" /> Simpan & Kirim Email</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal: Penilaian Seleksi ──────────────────── */}
            {penilaianModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-violet-50 dark:bg-violet-900/20 rounded-t-2xl">
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-violet-500" /> Penilaian Seleksi
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Peserta: <span className="font-bold text-violet-600 dark:text-violet-400">{penilaianModal.name}</span></p>
                            </div>
                            <button onClick={() => setPenilaianModal({ open: false, guruId: null, name: "" })}
                                className="text-gray-400 hover:text-gray-600 p-1"><XCircle className="w-5 h-5" /></button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-5">

                            {/* ── Ringkasan Jadwal Seleksi ── */}
                            {(() => {
                                const sel = penilaianModal.guruId ? seleksiData[penilaianModal.guruId] : null
                                return sel ? (
                                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-800 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Info Jadwal Seleksi</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                <span>{sel.date} · {sel.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                {sel.method === "online"
                                                    ? <Video className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                                    : <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                                }
                                                <span className="capitalize">{sel.method}</span>
                                            </div>
                                            {sel.penguji && (
                                                <div className="col-span-2 flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                                                    <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                                                    <span>
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Penyeleksi:</span> {sel.penguji}
                                                    </span>
                                                </div>
                                            )}
                                            {sel.link && (
                                                <div className="col-span-2 flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                                                    {sel.method === "online"
                                                        ? <Video className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                        : <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                                                    }
                                                    <span className="truncate text-[11px]">{sel.link}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>Data jadwal seleksi belum tersedia.</span>
                                    </div>
                                )
                            })()}

                            {/* ── Konfirmasi Kehadiran ── */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Konfirmasi Kehadiran</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPHadir("hadir")}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${pHadir === "hadir" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-emerald-300"}`}>
                                        <CheckCircle2 className="w-4 h-4" /> Hadir
                                    </button>
                                    <button onClick={() => setPHadir("tidak_hadir")}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${pHadir === "tidak_hadir" ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-rose-300"}`}>
                                        <XCircle className="w-4 h-4" /> Tidak Hadir
                                    </button>
                                </div>
                            </div>

                            {/* ── Kriteria Penilaian ── */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kriteria Penilaian (Skala 1–9)</p>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-0.5">
                                    <ScoreInput label="Kelancaran Baca" value={pFluency}     onChange={setPFluency} />
                                    <ScoreInput label="Tajwid & Makhraj" value={pTajweed}    onChange={setPTajweed} />
                                    <ScoreInput label="Intonasi Suara"  value={pIntonation}  onChange={setPIntonation} />
                                    <ScoreInput label="Penampilan"       value={pAppearance}  onChange={setPAppearance} />
                                    <ScoreInput label="Pengalaman"       value={pExperience}  onChange={setPExperience} />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-1">
                                    <span>Rata-rata: <span className="font-bold text-gray-700 dark:text-gray-300">{((pFluency + pTajweed + pIntonation + pAppearance + pExperience) / 5).toFixed(1)}</span></span>
                                    <span>Nilai min. lolos: <span className="font-bold text-emerald-600">≥ 6.0</span></span>
                                </div>
                            </div>

                            {!pHadir && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <p className="text-xs text-amber-700 dark:text-amber-400">Pilih status kehadiran sebelum memberikan keputusan akhir.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => handleSubmitPenilaian("ditolak")} disabled={!pHadir}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-rose-500 rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors">
                                <XCircle className="w-4 h-4" /> Tolak
                            </button>
                            <button onClick={() => handleSubmitPenilaian("diterima")} disabled={!pHadir}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                                <CheckCircle2 className="w-4 h-4" /> Terima Guru
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </TooltipProvider>
    )
}

export default function PengajuanGuruPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <Suspense fallback={<div className="p-4 text-gray-500">Memuat data...</div>}>
                    <PengajuanContent />
                </Suspense>
            </I18nProvider>
        </DashboardLayout>
    )
}
